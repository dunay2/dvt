/**
 * @file packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 2 — Worker lifecycle ownership is centralized in a single host
 * @decision Section 3 — Worker startup binds deterministic workflow + activities wiring
 * @consequence Temporal worker start/shutdown behavior remains predictable across integration and runtime paths
 * @version 1.1.0
 * @date 2026-03-08
 */

import type { IObservability } from '@dvt/observability';
import { NativeConnection, Worker } from '@temporalio/worker';

import type {
  ActivityDeps,
  SimulateErrorPolicy,
  StepExecutor,
} from './activities/stepActivities.js';
import {
  createActivities,
  UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION_ERROR,
} from './activities/stepActivities.js';
import type { TemporalAdapterConfig } from './config.js';
import {
  buildTemporalContext,
  buildTemporalMetricTags,
  resolveTemporalObservability,
  runObservedTemporalOperation,
  toErrorMessage,
} from './temporalObservability.js';

export interface TemporalWorkerHostConfig {
  temporalConfig: TemporalAdapterConfig;
  activityDeps: ActivityDeps;
  observability?: IObservability;
  /** Optional policy override injected from composition root. */
  simulateErrorPolicy?: SimulateErrorPolicy;
  /** Override for testing; defaults to bundling RunPlanWorkflow. */
  workflowsPath?: string;
  /**
   * Override the step executor registry. Defaults to DEFAULT_STEP_EXECUTORS.
   * Inject custom executors in integration tests to simulate step failures
   * without using the `simulateError` plan field.
   */
  stepExecutors?: readonly StepExecutor[];
}

interface WorkerRunState {
  promise: Promise<void>;
  exitResult: 'pending' | 'ok' | 'error';
}

export class TemporalWorkerHost {
  private worker: Worker | null = null;
  private runningState: WorkerRunState | null = null;
  private readonly observability: IObservability;

  constructor(private readonly config: TemporalWorkerHostConfig) {
    this.observability = resolveTemporalObservability(config.observability);
  }

  /**
   * Create the Temporal Worker and start polling.
   * Requires an already-established NativeConnection.
   */
  async start(connection: NativeConnection): Promise<void> {
    if (this.worker) {
      throw new Error('TEMPORAL_WORKER_ALREADY_STARTED');
    }

    const context = buildTemporalContext(this.config.temporalConfig);
    const attributes = {
      namespace: this.config.temporalConfig.namespace,
      identity: this.config.temporalConfig.identity ?? '',
    };

    await runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.worker.start',
      spanAttributes: attributes,
      counterName: 'dvt.temporal.worker.started_total',
      durationName: 'dvt.temporal.worker.start.duration_ms',
      metricOperation: 'start',
      run: async () => {
        const effectiveSimulateErrorPolicy =
          this.config.activityDeps.simulateErrorPolicy ?? this.config.simulateErrorPolicy;
        assertSafeSimulateErrorPolicyForRuntime(effectiveSimulateErrorPolicy);

        const activities = createActivities(
          {
            ...this.config.activityDeps,
            observability: this.config.activityDeps.observability ?? this.observability,
            simulateErrorPolicy: effectiveSimulateErrorPolicy,
          },
          this.config.stepExecutors
        );

        this.observability.logs.info({
          msg: 'Starting Temporal worker host',
          context,
          attributes,
        });
        this.worker = await Worker.create({
          connection,
          namespace: this.config.temporalConfig.namespace,
          taskQueue: this.config.temporalConfig.taskQueue,
          workflowsPath:
            this.config.workflowsPath ?? require.resolve('./workflows/RunPlanWorkflow'),
          activities,
          identity: this.config.temporalConfig.identity,
        });

        const runState: WorkerRunState = {
          promise: Promise.resolve(),
          exitResult: 'pending',
        };
        runState.promise = this.worker
          .run()
          .then(() => {
            runState.exitResult = 'ok';
          })
          .catch((error) => {
            runState.exitResult = 'error';
            this.observability.metrics
              .counter(
                'dvt.temporal.worker.run_exit_total',
                buildTemporalMetricTags('runExit', 'error')
              )
              .add(1);
            this.observability.logs.error({
              msg: 'Temporal worker exited with error',
              context,
              err: error,
              attributes: {
                namespace: this.config.temporalConfig.namespace,
                error: toErrorMessage(error),
              },
            });
          })
          .finally(() => {
            this.clearRunningState(runState);
          });
        this.runningState = runState;
      },
      onSuccess: () => ({
        result: 'ok',
        logMessage: 'Temporal worker host started',
        logLevel: 'info',
        logAttributes: attributes,
      }),
      onError: (error) => {
        this.clearRunningState();
        return {
          result: 'error',
          logMessage: 'Temporal worker host failed to start',
          logLevel: 'error',
          logAttributes: {
            namespace: this.config.temporalConfig.namespace,
            error: toErrorMessage(error),
          },
        };
      },
    });
  }

  /** Gracefully drain in-flight work and stop polling. */
  async shutdown(): Promise<void> {
    const currentWorker = this.worker;
    const currentRun = this.runningState;
    if (!currentWorker || !currentRun) return;

    const context = buildTemporalContext(this.config.temporalConfig);
    const attributes = {
      namespace: this.config.temporalConfig.namespace,
      identity: this.config.temporalConfig.identity ?? '',
    };

    await runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.worker.shutdown',
      spanAttributes: attributes,
      counterName: 'dvt.temporal.worker.shutdown_total',
      durationName: 'dvt.temporal.worker.shutdown.duration_ms',
      metricOperation: 'shutdown',
      run: async () => {
        currentWorker.shutdown();
        try {
          await currentRun.promise;
          if (currentRun.exitResult === 'ok') {
            this.observability.metrics
              .counter(
                'dvt.temporal.worker.run_exit_total',
                buildTemporalMetricTags('runExit', 'ok')
              )
              .add(1);
          }
        } finally {
          this.clearRunningState(currentRun);
        }
      },
      onSuccess: () => ({
        result: 'ok',
        logMessage: 'Temporal worker host shut down',
        logLevel: 'info',
        logAttributes: attributes,
      }),
      onError: (error) => ({
        result: 'error',
        logMessage: 'Temporal worker host shutdown failed',
        logLevel: 'error',
        logAttributes: {
          namespace: this.config.temporalConfig.namespace,
          error: toErrorMessage(error),
        },
      }),
    });
  }

  isRunning(): boolean {
    return this.worker !== null;
  }

  private clearRunningState(expectedRun?: WorkerRunState): void {
    if (expectedRun !== undefined && this.runningState !== expectedRun) {
      return;
    }
    this.worker = null;
    this.runningState = null;
  }
}

function assertSafeSimulateErrorPolicyForRuntime(policy?: SimulateErrorPolicy): void {
  if (!isProductionRuntime()) {
    return;
  }
  if (policy?.rejectInProduction !== false) {
    return;
  }
  throw new Error(UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION_ERROR);
}

function isProductionRuntime(): boolean {
  return (process.env['NODE_ENV'] ?? '').trim().toLowerCase() === 'production';
}
