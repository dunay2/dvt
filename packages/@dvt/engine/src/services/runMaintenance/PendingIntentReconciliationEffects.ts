/**
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @ownedConcern Apply a selected pending-intent transition, preserving effect ordering and failure reporting.
 * @decision Apply decisions without re-reading or reinterpreting their authority evidence.
 * @version 1.0.0
 */
import type { EngineRunRef } from '@dvt/contracts';

import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';

import type { PendingIntentDecision } from './decidePendingIntentReconciliation.js';
import type {
  OrphanedIntent,
  ReconcileOrphanedIntentOutcome,
  RunMaintenanceServiceDeps,
  RunMaintenanceTraceContext,
} from './RunMaintenanceContracts.js';
import {
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
  RUN_MAINTENANCE_OPERATION,
} from './RunMaintenanceDomainConstants.js';
import type { RunMaintenanceObservabilityFacade } from './RunMaintenanceObservabilityFacade.js';

type EffectDeps = {
  intentStore: Pick<
    RunMaintenanceServiceDeps['intentStore'],
    'markDispatched' | 'markResolved' | 'markExpired'
  >;
  stateStoreWrite: Pick<RunMaintenanceServiceDeps['stateStoreWrite'], 'saveProviderRef'>;
  observability: RunMaintenanceObservabilityFacade;
};
const DEFER_DIAGNOSTICS = {
  metadata_failed: {
    metric: RUN_MAINTENANCE_METRIC.intentDeferredMetadataReadFailedTotal,
    message: RUN_MAINTENANCE_MESSAGE.pendingIntentMetadataReadFailed,
  },
  lookup_failed: {
    metric: RUN_MAINTENANCE_METRIC.intentDeferredLookupFailedTotal,
    message: RUN_MAINTENANCE_MESSAGE.pendingIntentLookupFailed,
  },
  status_failed: {
    metric: RUN_MAINTENANCE_METRIC.intentDeferredRunStateReadFailedTotal,
    message: RUN_MAINTENANCE_MESSAGE.pendingIntentRunStateReadFailed,
  },
  lookup_unsupported: {
    metric: RUN_MAINTENANCE_METRIC.intentDeferredLookupUnsupportedTotal,
    message: RUN_MAINTENANCE_MESSAGE.pendingIntentLookupUnsupported,
  },
} as const;

export class PendingIntentReconciliationEffects {
  constructor(private readonly deps: EffectDeps) {}

  async apply(
    decision: PendingIntentDecision,
    intent: OrphanedIntent,
    context: RunMaintenanceTraceContext,
    adapter: Pick<IProviderAdapter, 'cancelRun'> | undefined
  ): Promise<ReconcileOrphanedIntentOutcome> {
    switch (decision.kind) {
      case 'defer':
        return this.defer(decision, intent, context);
      case 'adopt':
        return this.adopt(intent, decision.runRef, context);
      case 'cancel': {
        if (adapter === undefined)
          throw new Error(RUN_MAINTENANCE_MESSAGE.pendingIntentCancelWithoutAdapter);
        return this.cancel(intent, decision.runRef, context, adapter);
      }
      case 'expire_missing':
      case 'expire_terminal':
        return this.expire(decision, intent, context);
      case 'ready_to_dispatch':
        this.counter(RUN_MAINTENANCE_METRIC.intentDeferredBootstrappedWithoutWorkflowTotal, intent);
        this.deps.observability.warn({
          msg: RUN_MAINTENANCE_MESSAGE.pendingIntentBootstrappedWithoutWorkflow,
          context,
          attributes: this.attributes(intent),
        });
        return { readyToDispatch: intent.intentId };
    }
  }

  private async adopt(
    intent: OrphanedIntent,
    runRef: EngineRunRef,
    context: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    try {
      await this.deps.stateStoreWrite.saveProviderRef(intent.tenantId, intent.runId, runRef);
      await this.deps.intentStore.markDispatched(
        { tenantId: intent.tenantId, intentId: intent.intentId },
        runRef
      );
      await this.deps.intentStore.markResolved({
        tenantId: intent.tenantId,
        intentId: intent.intentId,
      });
      this.counter(RUN_MAINTENANCE_METRIC.intentResolvedTotal, intent);
      this.deps.observability.info({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentResolvedBootstrapped,
        context,
        attributes: this.attributes(intent),
      });
      return { resolved: intent.intentId };
    } catch (err) {
      this.deps.observability.error({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentAdoptionFailed,
        context,
        err,
        attributes: this.attributes(intent),
      });
      return { deferred: intent.intentId };
    }
  }

  private async cancel(
    intent: OrphanedIntent,
    runRef: EngineRunRef,
    context: RunMaintenanceTraceContext,
    adapter: Pick<IProviderAdapter, 'cancelRun'>
  ): Promise<ReconcileOrphanedIntentOutcome> {
    try {
      await adapter.cancelRun(runRef);
      await this.deps.intentStore.markExpired({
        tenantId: intent.tenantId,
        intentId: intent.intentId,
      });
      this.counter(RUN_MAINTENANCE_METRIC.intentExpiredAfterCancelTotal, intent);
      this.deps.observability.info({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentExpiredAfterCancel,
        context,
        attributes: this.attributes(intent),
      });
      return { expired: intent.intentId };
    } catch (err) {
      this.deps.observability.error({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentCancelFailed,
        context,
        err,
        attributes: { intentId: intent.intentId, runId: intent.runId },
      });
      return { cancelFailed: intent.intentId };
    }
  }

  private async expire(
    decision: Extract<PendingIntentDecision, { kind: 'expire_missing' | 'expire_terminal' }>,
    intent: OrphanedIntent,
    context: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    await this.deps.intentStore.markExpired({
      tenantId: intent.tenantId,
      intentId: intent.intentId,
    });
    const terminal = decision.kind === 'expire_terminal';
    const count = (): void =>
      this.deps.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentExpiredTotal, {
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      });
    if (terminal) count();
    this.deps.observability.info({
      msg: terminal
        ? RUN_MAINTENANCE_MESSAGE.pendingIntentExpiredTerminalRun
        : RUN_MAINTENANCE_MESSAGE.pendingIntentExpiredNoWorkflow,
      context,
      attributes: {
        intentId: intent.intentId,
        runId: intent.runId,
        ...(terminal ? { status: decision.status } : {}),
      },
    });
    if (!terminal) count();
    return { expired: intent.intentId };
  }

  private defer(
    decision: Extract<PendingIntentDecision, { kind: 'defer' }>,
    intent: OrphanedIntent,
    context: RunMaintenanceTraceContext
  ): ReconcileOrphanedIntentOutcome {
    const { observation } = decision;
    const diagnostic = DEFER_DIAGNOSTICS[observation.kind];
    this.counter(diagnostic.metric, intent);
    this.deps.observability.warn({
      msg: diagnostic.message,
      context,
      ...(observation.kind === 'lookup_unsupported' ? {} : { err: observation.error }),
      attributes: {
        ...this.attributes(intent),
        ...(observation.kind === 'lookup_unsupported'
          ? { hasBootstrappedRun: String(observation.hasBootstrappedRun) }
          : {}),
      },
    });
    return { deferred: intent.intentId };
  }

  private counter(name: string, intent: OrphanedIntent): void {
    this.deps.observability.incrementCounter(name, {
      provider: intent.provider,
      operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
    });
  }

  private attributes(intent: OrphanedIntent): Record<string, string> {
    return { intentId: intent.intentId, runId: intent.runId, provider: intent.provider };
  }
}
