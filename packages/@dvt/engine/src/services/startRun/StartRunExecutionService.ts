import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

import { START_RUN_MESSAGE } from './StartRunDomainConstants.js';
import type { StartRunEventFactory } from './StartRunEventFactory.js';
import {
  PostStartIntentPersistenceError,
  type StartRunFailurePolicy,
} from './StartRunFailurePolicy.js';

type EngineRunRef = import('@dvt/contracts').EngineRunRef;
type PlanRef = import('@dvt/contracts').PlanRef;
type ResolvedRunContext = import('@dvt/contracts').ResolvedRunContext;
type IObservability = import('@dvt/observability').IObservability;
type IProviderAdapter = import('../../adapters/IProviderAdapter.js').IProviderAdapter;
type IRunStateStoreWrite = import('../../ports/IRunStateStore.js').IRunStateStoreWrite;
type IStartRunIntentStore = import('../../ports/IStartRunIntentStore.js').IStartRunIntentStore;
type IClock = import('../../utils/clock.js').IClock;

export interface StartRunExecutionServiceDeps {
  stateStoreWrite: IRunStateStoreWrite;
  intentStore: IStartRunIntentStore;
  eventFactory: StartRunEventFactory;
  failurePolicy: StartRunFailurePolicy;
  observability: IObservability;
  clock: IClock;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
}

export class StartRunExecutionService {
  constructor(private readonly deps: StartRunExecutionServiceDeps) {}

  async executeStartRun(input: {
    adapter: IProviderAdapter;
    planRef: PlanRef;
    resolvedContext: ResolvedRunContext;
    traceContext: StartRunTraceContext;
    intentId: string;
  }): Promise<EngineRunRef> {
    const { adapter } = input;
    if (adapter.estimateRunRef) {
      const estimatedRef = adapter.estimateRunRef(input.resolvedContext);
      return this.startRunWithEstimatedRef({
        ...input,
        estimatedRef,
      });
    }
    return this.startRunWithoutEstimatedRef(input);
  }

  private async startRunWithEstimatedRef(input: {
    adapter: IProviderAdapter;
    planRef: PlanRef;
    estimatedRef: EngineRunRef;
    resolvedContext: ResolvedRunContext;
    traceContext: StartRunTraceContext;
    intentId: string;
  }): Promise<EngineRunRef> {
    const { adapter, planRef, estimatedRef, resolvedContext, traceContext, intentId } = input;
    const bootMeta = this.deps.eventFactory.buildRunMetadata(
      resolvedContext,
      planRef,
      estimatedRef,
      this.deps.clock.nowIsoUtc()
    );
    await this.deps.stateStoreWrite.bootstrapRunTx({
      metadata: bootMeta,
      firstEvents: [this.deps.eventFactory.buildRunEvent(bootMeta, 'RunQueued')],
    });

    const runRef = await this.startAdapterAndMarkDispatched({
      adapter,
      planRef,
      resolvedContext,
      intentId,
    });

    await this.reconcileEstimatedRunRef({
      adapter,
      resolvedContext,
      estimatedRef,
      runRef,
      traceContext,
      intentId,
    });
    await this.deps.failurePolicy.markIntentResolvedBestEffort({
      intentId,
      tenantId: resolvedContext.tenantId,
      runId: resolvedContext.runId,
      provider: resolvedContext.targetAdapter,
      traceContext,
    });
    return runRef;
  }

  private async startRunWithoutEstimatedRef(input: {
    adapter: IProviderAdapter;
    planRef: PlanRef;
    resolvedContext: ResolvedRunContext;
    traceContext: StartRunTraceContext;
    intentId: string;
  }): Promise<EngineRunRef> {
    const { adapter, planRef, resolvedContext, traceContext, intentId } = input;
    const runRef = await this.startAdapterAndMarkDispatched({
      adapter,
      planRef,
      resolvedContext,
      intentId,
    });

    const bootMeta = this.deps.eventFactory.buildRunMetadata(
      resolvedContext,
      planRef,
      runRef,
      this.deps.clock.nowIsoUtc()
    );
    await this.bootstrapRunTxWithCompensation({
      bootMeta,
      adapter,
      runRef,
      intentId,
      traceContext,
    });
    return runRef;
  }

  private async startAdapterAndMarkDispatched(input: {
    adapter: IProviderAdapter;
    planRef: PlanRef;
    resolvedContext: ResolvedRunContext;
    intentId: string;
  }): Promise<EngineRunRef> {
    const { adapter, planRef, resolvedContext, intentId } = input;
    const runRef = await this.withTimeout(
      adapter.startRun(planRef, resolvedContext),
      this.deps.timeouts?.adapterCallMs ?? 30_000,
      'adapter.startRun'
    );
    try {
      await this.deps.intentStore.markDispatched(
        { tenantId: resolvedContext.tenantId, intentId },
        runRef
      );
    } catch (markDispatchedError) {
      throw new PostStartIntentPersistenceError(intentId, runRef, markDispatchedError);
    }
    return runRef;
  }

  private async bootstrapRunTxWithCompensation(input: {
    bootMeta: ReturnType<StartRunEventFactory['buildRunMetadata']>;
    adapter: IProviderAdapter;
    runRef: EngineRunRef;
    intentId: string;
    traceContext: StartRunTraceContext;
  }): Promise<void> {
    const { bootMeta, adapter, runRef, intentId, traceContext } = input;
    try {
      await this.deps.stateStoreWrite.bootstrapRunTx({
        metadata: bootMeta,
        firstEvents: [this.deps.eventFactory.buildRunEvent(bootMeta, 'RunQueued')],
      });
      await this.deps.failurePolicy.markIntentResolvedBestEffort({
        intentId,
        tenantId: bootMeta.tenantId,
        runId: bootMeta.runId,
        provider: bootMeta.providerRef.provider,
        traceContext,
      });
    } catch (bootstrapError) {
      await adapter.cancelRun(runRef).catch((cancelErr: unknown) => {
        try {
          this.deps.observability.logs.error({
            msg: START_RUN_MESSAGE.compensationCancelFailed,
            context: traceContext,
            err: cancelErr,
            attributes: {
              error: toErrorMessage(cancelErr),
            },
          });
        } catch {
          // no-op: observability reporting must not hide the bootstrap error.
        }
      });
      await this.deps.failurePolicy.markIntentResolvedBestEffort({
        intentId,
        tenantId: bootMeta.tenantId,
        runId: bootMeta.runId,
        provider: bootMeta.providerRef.provider,
        traceContext,
      });
      throw bootstrapError;
    }
  }

  private async reconcileEstimatedRunRef(input: {
    adapter: IProviderAdapter;
    resolvedContext: ResolvedRunContext;
    estimatedRef: EngineRunRef;
    runRef: EngineRunRef;
    traceContext: StartRunTraceContext;
    intentId: string;
  }): Promise<void> {
    const { adapter, resolvedContext, estimatedRef, runRef, traceContext, intentId } = input;
    if (engineRunRefsEqual(estimatedRef, runRef)) {
      return;
    }

    try {
      await this.deps.stateStoreWrite.saveProviderRef(
        resolvedContext.tenantId,
        resolvedContext.runId,
        runRef
      );
    } catch (reconcileError) {
      try {
        this.deps.observability.logs.error({
          msg: START_RUN_MESSAGE.providerRefReconciliationFailed,
          context: traceContext,
          err: reconcileError,
          attributes: {
            runId: resolvedContext.runId,
            provider: runRef.provider,
            estimatedRunRef: JSON.stringify(estimatedRef),
            actualRunRef: JSON.stringify(runRef),
          },
        });
      } catch {
        // no-op: observability reporting must not hide the reconciliation error.
      }

      await adapter.cancelRun(runRef).catch((cancelErr: unknown) => {
        try {
          this.deps.observability.logs.error({
            msg: START_RUN_MESSAGE.providerRefReconciliationCancelFailed,
            context: traceContext,
            err: cancelErr,
            attributes: {
              error: toErrorMessage(cancelErr),
              provider: runRef.provider,
            },
          });
        } catch {
          // no-op: observability reporting must not hide the reconciliation error.
        }
      });

      await this.deps.failurePolicy.markIntentResolvedBestEffort({
        intentId,
        tenantId: resolvedContext.tenantId,
        runId: resolvedContext.runId,
        provider: runRef.provider,
        traceContext,
      });

      throw reconcileError;
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    // Intentionally local: startRun execution has a dedicated failure/compensation flow
    // and should keep timeout handling co-located with that policy.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}

function engineRunRefsEqual(left: EngineRunRef, right: EngineRunRef): boolean {
  if (
    left.provider !== right.provider ||
    left.tenantId !== right.tenantId ||
    left.workflowId !== right.workflowId ||
    left.runId !== right.runId
  ) {
    return false;
  }

  return left.namespace === right.namespace && left.taskQueue === right.taskQueue;
}
