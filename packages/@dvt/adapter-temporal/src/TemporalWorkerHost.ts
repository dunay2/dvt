/**
 * @file packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
 * @ownedConcern Temporal worker lifecycle and activity binding host
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 2 — Worker lifecycle ownership is centralized in a single host
 * @decision Section 3 — Worker startup binds deterministic workflow + activities wiring
 * @consequence Temporal worker start/shutdown behavior remains predictable across integration and runtime paths
 * @version 1.1.0
 * @date 2026-03-08
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Attributes, IObservability } from '@dvt/observability';
import { NativeConnection, Worker } from '@temporalio/worker';

import type {
  ActivityDeps,
  ActivityHeartbeat,
  StepActivityRegistry,
  StepExecutor,
} from './activities/stepActivities.js';
import { createActivities } from './activities/stepActivities.js';
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
  /** Override for testing; defaults to bundling RunPlanWorkflow. */
  workflowsPath?: string;
  /**
   * Override the step executor registry. Defaults to DEFAULT_STEP_EXECUTORS.
   * Inject custom executors in integration tests to simulate step failures
   * without using the `simulateError` plan field.
   */
  stepExecutors?: readonly StepExecutor[];
  /**
   * Register runtime step activities by StepKind without changing workflow code.
   * Worker profiles compose plugin registries here while the core registry stays empty.
   */
  stepActivitiesByKind?: StepActivityRegistry;
  /** Override for direct activity tests; workers use the Temporal heartbeat adapter. */
  activityHeartbeat?: ActivityHeartbeat;
}

export type TemporalWorkerRunResult =
  { readonly status: 'completed' } | { readonly status: 'failed'; readonly error: unknown };

type WorkerLogAttributes = Attributes;

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKFLOW_TS_PATH = resolve(MODULE_DIR, 'workflows/RunPlanWorkflow.ts');
const DEFAULT_WORKFLOW_JS_PATH = resolve(MODULE_DIR, 'workflows/RunPlanWorkflow.js');

function resolveDefaultWorkflowsPath(): string {
  return existsSync(DEFAULT_WORKFLOW_TS_PATH) ? DEFAULT_WORKFLOW_TS_PATH : DEFAULT_WORKFLOW_JS_PATH;
}

export class TemporalWorkerHost {
  private worker: Worker | null = null;
  private runCompletion: Promise<TemporalWorkerRunResult> | null = null;
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
    this.runCompletion = null;

    const context = buildTemporalContext(this.config.temporalConfig);
    const activities = this.createConfiguredActivities();
    const attributes = this.buildWorkerLogAttributes();

    await runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.worker.start',
      spanAttributes: attributes,
      counterName: 'dvt.temporal.worker.started_total',
      durationName: 'dvt.temporal.worker.start.duration_ms',
      metricOperation: 'start',
      run: async () => this.startWorkerRun(connection, activities, context, attributes),
      onSuccess: () => ({
        result: 'ok',
        logMessage: 'Temporal worker host started',
        logLevel: 'info',
        logAttributes: attributes,
      }),
      onError: (error) => {
        this.clearWorker();
        return {
          result: 'error',
          logMessage: 'Temporal worker host failed to start',
          logLevel: 'error',
          logAttributes: this.buildWorkerErrorAttributes(error),
        };
      },
    });
  }

  /** Gracefully drain in-flight work and stop polling. */
  async shutdown(): Promise<void> {
    const currentWorker = this.worker;
    const currentRun = this.runCompletion;
    if (!currentWorker || !currentRun) return;

    const context = buildTemporalContext(this.config.temporalConfig);
    const attributes = this.buildWorkerLogAttributes();

    await runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.worker.shutdown',
      spanAttributes: attributes,
      counterName: 'dvt.temporal.worker.shutdown_total',
      durationName: 'dvt.temporal.worker.shutdown.duration_ms',
      metricOperation: 'shutdown',
      run: async () => {
        if (currentWorker.getState() === 'RUNNING') {
          currentWorker.shutdown();
        }
        try {
          const result = await currentRun;
          if (result.status === 'completed') {
            this.observability.metrics
              .counter(
                'dvt.temporal.worker.run_exit_total',
                buildTemporalMetricTags('runExit', 'ok')
              )
              .add(1);
          }
        } finally {
          this.clearWorker(currentRun);
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
        logAttributes: this.buildWorkerErrorAttributes(error),
      }),
    });
  }

  isRunning(): boolean {
    return this.worker !== null;
  }

  getRunCompletion(): Promise<TemporalWorkerRunResult> | null {
    return this.runCompletion;
  }

  private clearWorker(expectedRun?: Promise<TemporalWorkerRunResult>): void {
    if (expectedRun !== undefined && this.runCompletion !== expectedRun) {
      return;
    }
    this.worker = null;
  }

  private createConfiguredActivities(): ReturnType<typeof createActivities> {
    return createActivities(
      this.config.activityDeps,
      this.config.stepExecutors,
      this.config.stepActivitiesByKind,
      this.config.activityHeartbeat
    );
  }

  private buildWorkerLogAttributes(): WorkerLogAttributes {
    return {
      namespace: this.config.temporalConfig.connection.namespace,
      identity: this.config.temporalConfig.connection.identity ?? '',
    };
  }

  private buildWorkerErrorAttributes(error: unknown): { namespace: string; error: string } {
    return {
      namespace: this.config.temporalConfig.connection.namespace,
      error: toErrorMessage(error),
    };
  }

  private async startWorkerRun(
    connection: NativeConnection,
    activities: ReturnType<typeof createActivities>,
    context: ReturnType<typeof buildTemporalContext>,
    attributes: WorkerLogAttributes
  ): Promise<void> {
    this.observability.logs.info({
      msg: 'Starting Temporal worker host',
      context,
      attributes,
    });
    this.worker = await this.createWorker(connection, activities);
    this.runCompletion = this.createWorkerRunCompletion(this.worker, context);
  }

  private createWorker(
    connection: NativeConnection,
    activities: ReturnType<typeof createActivities>
  ): Promise<Worker> {
    const identity = this.config.temporalConfig.connection.identity;

    return Worker.create({
      connection,
      namespace: this.config.temporalConfig.connection.namespace,
      taskQueue: this.config.temporalConfig.connection.taskQueue,
      workflowsPath: this.config.workflowsPath ?? resolveDefaultWorkflowsPath(),
      activities,
      maxHeartbeatThrottleInterval: '1s',
      ...(identity === undefined ? {} : { identity }),
    });
  }

  private createWorkerRunCompletion(
    worker: Worker,
    context: ReturnType<typeof buildTemporalContext>
  ): Promise<TemporalWorkerRunResult> {
    const completion = worker
      .run()
      .then<TemporalWorkerRunResult, TemporalWorkerRunResult>(
        () => ({ status: 'completed' }),
        (error: unknown) => {
          this.recordWorkerRunExitError(context, error);
          return { status: 'failed', error };
        }
      )
      .finally(() => {
        this.clearWorker(completion);
      });

    return completion;
  }

  private recordWorkerRunExitError(
    context: ReturnType<typeof buildTemporalContext>,
    error: unknown
  ): void {
    this.observability.metrics
      .counter('dvt.temporal.worker.run_exit_total', buildTemporalMetricTags('runExit', 'error'))
      .add(1);
    this.observability.logs.error({
      msg: 'Temporal worker exited with error',
      context,
      err: error,
      attributes: this.buildWorkerErrorAttributes(error),
    });
  }
}
