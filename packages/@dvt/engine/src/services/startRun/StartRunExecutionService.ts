/**
 * @ownedConcern Sequence admitted dispatch, bootstrap and provider-reference persistence.
 */
import { parseEngineRunRef } from '@dvt/contracts';

import { normalizeEngineRunRef } from '../../core/lifecycle/coreRuntime.js';
import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import {
  requireStartRunMutation,
  StartRunIntentMutationRejectedError,
} from '../../domain/startRunIntentPolicy.js';
import type { StartRunIntentClaimReceipt } from '../../ports/IStartRunIntentStore.js';

import { StartRunCompensation } from './StartRunCompensation.js';
import type { StartRunEventFactory } from './StartRunEventFactory.js';
import { StartRunFailureDiagnostics } from './StartRunFailureDiagnostics.js';
import { PostStartIntentPersistenceError } from './StartRunFailurePolicy.js';
import type {
  IStartRunExecutionService,
  StartRunErrorContext,
  StartRunExecutionInput,
} from './StartRunTypes.js';

type EngineRunRef = import('@dvt/contracts').EngineRunRef;
type IObservability = import('@dvt/observability').IObservability;
type IRunStateStoreWrite = import('../../ports/IRunStateStore.js').IStartRunStateStoreWrite;
type IStartRunIntentStore = import('../../ports/IStartRunIntentStore.js').IStartRunIntentStore;
type IClock = import('../../utils/clock.js').IClock;

export interface StartRunExecutionServiceDeps {
  stateStoreWrite: IRunStateStoreWrite;
  intentStore: IStartRunIntentStore;
  eventFactory: StartRunEventFactory;
  observability: IObservability;
  clock: IClock;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
}

export class StartRunExecutionService implements IStartRunExecutionService {
  private readonly diagnostics: StartRunFailureDiagnostics;
  private readonly compensation: StartRunCompensation;
  private readonly deps: Omit<StartRunExecutionServiceDeps, 'observability'>;

  constructor(deps: StartRunExecutionServiceDeps) {
    const { observability, ...executionDeps } = deps;
    this.deps = executionDeps;
    this.diagnostics = new StartRunFailureDiagnostics({
      observability,
      clock: deps.clock,
    });
    this.compensation = new StartRunCompensation({
      intentStore: deps.intentStore,
      diagnostics: this.diagnostics,
    });
  }

  async executeStartRun(input: StartRunExecutionInput): Promise<EngineRunRef> {
    input.errorContext.phase = 'bootstrap';
    if (input.adapter.estimateRunRef) {
      const estimatedRef = input.adapter.estimateRunRef(input.resolvedContext);
      return this.startRunWithEstimatedRef({ ...input, estimatedRef });
    }
    return this.startRunWithoutEstimatedRef(input);
  }

  async executePreparedRun(
    input: StartRunExecutionInput & { preparedRunRef: EngineRunRef }
  ): Promise<EngineRunRef> {
    const runRef = await this.startAdapterAndMarkDispatched(input);
    await this.reconcileEstimatedRunRef({
      ...input,
      estimatedRef: input.preparedRunRef,
      runRef,
    });
    input.errorContext.phase = 'completion';
    await this.completeIntent(input.receipt, input.traceContext, runRef.provider);
    return runRef;
  }

  private async startRunWithEstimatedRef(
    input: StartRunExecutionInput & { estimatedRef: EngineRunRef }
  ): Promise<EngineRunRef> {
    const { planRef, estimatedRef, resolvedContext, traceContext, receipt, errorContext } = input;
    const bootMeta = this.deps.eventFactory.buildRunMetadata(
      resolvedContext,
      planRef,
      estimatedRef,
      this.deps.clock.nowIsoUtc()
    );
    requireStartRunMutation(
      await this.deps.stateStoreWrite.applyStartRunWrite(receipt, {
        kind: 'bootstrap',
        input: {
          metadata: bootMeta,
          firstEvents: [this.deps.eventFactory.buildRunEvent(bootMeta, 'RunQueued')],
        },
      })
    );
    errorContext.preparation = { disposition: 'created', runRef: estimatedRef };

    const runRef = await this.startAdapterAndMarkDispatched(input);
    await this.reconcileEstimatedRunRef({ ...input, runRef });
    errorContext.phase = 'completion';
    await this.completeIntent(receipt, traceContext, runRef.provider);
    return runRef;
  }

  private async startRunWithoutEstimatedRef(input: StartRunExecutionInput): Promise<EngineRunRef> {
    const { planRef, resolvedContext, traceContext, receipt, errorContext } = input;
    const runRef = await this.startAdapterAndMarkDispatched(input);
    const bootMeta = this.deps.eventFactory.buildRunMetadata(
      resolvedContext,
      planRef,
      runRef,
      this.deps.clock.nowIsoUtc()
    );
    await this.bootstrapRunTxWithCompensation({
      bootMeta,
      runRef,
      receipt,
      traceContext,
      errorContext,
    });
    return runRef;
  }

  private async startAdapterAndMarkDispatched(
    input: StartRunExecutionInput
  ): Promise<EngineRunRef> {
    const { adapter, planRef, resolvedContext, receipt, errorContext } = input;
    errorContext.phase = 'provider_dispatch';
    const authorization = await this.deps.intentStore.authorizeDispatch(receipt);
    if (authorization === 'already_applied')
      throw new StartRunIntentMutationRejectedError('invalid_state');
    requireStartRunMutation(authorization);
    const runRef = normalizeEngineRunRef(
      parseEngineRunRef(
        await this.withTimeout(
          adapter.startRun(planRef, resolvedContext),
          this.deps.timeouts?.adapterCallMs ?? 30_000,
          'adapter.startRun'
        )
      )
    );
    try {
      requireStartRunMutation(await this.deps.intentStore.markDispatched(receipt, runRef));
    } catch (markDispatchedError) {
      throw new PostStartIntentPersistenceError(receipt.intentId, runRef, markDispatchedError);
    }
    return runRef;
  }

  private async bootstrapRunTxWithCompensation(input: {
    bootMeta: ReturnType<StartRunEventFactory['buildRunMetadata']>;
    runRef: EngineRunRef;
    receipt: StartRunIntentClaimReceipt;
    traceContext: StartRunTraceContext;
    errorContext: StartRunErrorContext;
  }): Promise<void> {
    const { bootMeta, runRef, receipt, traceContext, errorContext } = input;
    errorContext.phase = 'bootstrap';
    try {
      requireStartRunMutation(
        await this.deps.stateStoreWrite.applyStartRunWrite(receipt, {
          kind: 'bootstrap',
          input: {
            metadata: bootMeta,
            firstEvents: [this.deps.eventFactory.buildRunEvent(bootMeta, 'RunQueued')],
          },
        })
      );
      errorContext.preparation = { disposition: 'created', runRef };
    } catch (bootstrapError) {
      if (bootstrapError instanceof StartRunIntentMutationRejectedError) throw bootstrapError;
      await this.compensation.compensate({
        runRef,
        receipt,
        traceContext,
        reason: 'bootstrap',
      });
      throw bootstrapError;
    }
    errorContext.phase = 'completion';
    await this.completeIntent(receipt, traceContext, runRef.provider);
  }

  private async completeIntent(
    receipt: StartRunIntentClaimReceipt,
    traceContext: StartRunTraceContext,
    provider: EngineRunRef['provider']
  ): Promise<void> {
    try {
      requireStartRunMutation(await this.deps.intentStore.markResolved(receipt));
    } catch (error) {
      this.diagnostics.markResolvedFailed(error, {
        intentId: receipt.intentId,
        tenantId: receipt.tenantId,
        runId: receipt.runId,
        provider,
        traceContext,
      });
      throw error;
    }
  }

  private async reconcileEstimatedRunRef(
    input: Omit<StartRunExecutionInput, 'planRef'> & {
      estimatedRef: EngineRunRef;
      runRef: EngineRunRef;
    }
  ): Promise<void> {
    const { resolvedContext, estimatedRef, runRef, traceContext, receipt } = input;
    input.errorContext.phase = 'provider_ref_reconciliation';
    try {
      requireStartRunMutation(
        await this.deps.stateStoreWrite.applyStartRunWrite(receipt, {
          kind: 'bind_provider',
          providerRef: runRef,
        })
      );
    } catch (reconcileError) {
      if (reconcileError instanceof StartRunIntentMutationRejectedError) throw reconcileError;
      this.diagnostics.providerRefReconciliationFailed(
        reconcileError,
        resolvedContext.runId,
        estimatedRef,
        runRef,
        traceContext
      );
      await this.compensation.compensate({
        runRef,
        receipt,
        traceContext,
        reason: 'provider_ref_reconciliation',
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
