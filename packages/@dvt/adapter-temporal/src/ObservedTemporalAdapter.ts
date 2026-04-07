import type {
  EngineRunRef,
  ExecutionPlan,
  PlanRef,
  ResolvedRunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';
import type { IProviderAdapter } from '@dvt/engine';
import type { IObservability } from '@dvt/observability';

import type { TemporalAdapterConfig } from './config.js';
import {
  buildTemporalContext,
  resolveTemporalObservability,
  runObservedTemporalOperation,
  toErrorMessage,
} from './temporalObservability.js';
import { toTemporalTaskQueue, toTemporalWorkflowId } from './WorkflowMapper.js';

interface TemporalOperationalAdapter extends IProviderAdapter {
  readonly capabilities?: () => readonly string[];
  readonly lookupRunRef?: (runId: string, tenantId: string) => Promise<EngineRunRef | null>;
  readonly ping?: () => Promise<void>;
}

export interface ObservedTemporalAdapterDeps {
  readonly adapter: TemporalOperationalAdapter;
  readonly config: TemporalAdapterConfig;
  readonly observability?: IObservability;
}

export class ObservedTemporalAdapter implements IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  private readonly observability: IObservability;

  constructor(private readonly deps: ObservedTemporalAdapterDeps) {
    this.provider = deps.adapter.provider;
    this.observability = resolveTemporalObservability(deps.observability);
  }

  startRun(plan: ExecutionPlan, planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef> {
    return this.deps.adapter.startRun(plan, planRef, ctx);
  }

  cancelRun(runRef: EngineRunRef): Promise<void> {
    return this.deps.adapter.cancelRun(runRef);
  }

  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot> {
    return this.deps.adapter.getRunStatus(runRef);
  }

  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void> {
    return this.deps.adapter.signal(runRef, request);
  }

  capabilities(): readonly string[] {
    return this.deps.adapter.capabilities?.() ?? [];
  }

  async lookupRunRef(runId: string, tenantId: string): Promise<EngineRunRef | null> {
    if (!this.deps.adapter.lookupRunRef) {
      return null;
    }

    const workflowId = toTemporalWorkflowId(runId);
    const taskQueue = toTemporalTaskQueue(tenantId, this.deps.config);
    const context = buildTemporalContext(this.deps.config, { tenantId, runId, taskQueue });

    return runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.lookupRunRef',
      spanAttributes: {
        workflowId,
        namespace: this.deps.config.namespace,
      },
      counterName: 'dvt.temporal.lookup_run_ref_total',
      durationName: 'dvt.temporal.lookup_run_ref.duration_ms',
      metricOperation: 'lookupRunRef',
      run: () => this.deps.adapter.lookupRunRef!(runId, tenantId),
      onSuccess: (runRef) =>
        runRef === null
          ? {
              result: 'missing',
              logMessage: 'Temporal workflow missing during lookupRunRef',
              logLevel: 'info',
              logAttributes: {
                workflowId,
                namespace: this.deps.config.namespace,
              },
            }
          : {
              result: 'found',
              logMessage: 'Temporal workflow found during lookupRunRef',
              logLevel: 'info',
              logAttributes: {
                workflowId,
                namespace: this.deps.config.namespace,
              },
            },
      onError: (error) => ({
        result: 'error',
        logMessage: 'Temporal lookupRunRef failed',
        logLevel: 'error',
        logAttributes: {
          workflowId,
          namespace: this.deps.config.namespace,
          error: toErrorMessage(error),
        },
      }),
    });
  }

  async ping(): Promise<void> {
    if (!this.deps.adapter.ping) {
      return;
    }

    const context = buildTemporalContext(this.deps.config);
    await runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.ping',
      spanAttributes: {
        address: this.deps.config.address,
        namespace: this.deps.config.namespace,
      },
      counterName: 'dvt.temporal.ping_total',
      durationName: 'dvt.temporal.ping.duration_ms',
      metricOperation: 'ping',
      run: () => this.deps.adapter.ping!(),
      onError: (error) => ({
        result: 'error',
        logMessage: 'Temporal ping failed',
        logLevel: 'error',
        logAttributes: {
          address: this.deps.config.address,
          namespace: this.deps.config.namespace,
          error: toErrorMessage(error),
        },
      }),
    });
  }
}
