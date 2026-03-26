import {
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
  RUN_MAINTENANCE_OPERATION,
} from './RunMaintenanceDomainConstants.js';

type EngineRunRef = import('@dvt/contracts').EngineRunRef;
type IProviderAdapter = import('../../adapters/IProviderAdapter.js').IProviderAdapter;
type OrphanedIntent = import('./RunMaintenanceContracts.js').OrphanedIntent;
type ReconcileOrphanedIntentOutcome =
  import('./RunMaintenanceContracts.js').ReconcileOrphanedIntentOutcome;
type RunMaintenanceServiceDeps = import('./RunMaintenanceContracts.js').RunMaintenanceServiceDeps;
type RunMaintenanceTraceContext = import('./RunMaintenanceContracts.js').RunMaintenanceTraceContext;
type RunMaintenanceObservabilityFacade =
  import('./RunMaintenanceObservabilityFacade.js').RunMaintenanceObservabilityFacade;

type PendingIntentReconciliationPolicyDeps = Pick<
  RunMaintenanceServiceDeps,
  'adapters' | 'intentStore' | 'stateStoreRead'
> & {
  observability: RunMaintenanceObservabilityFacade;
};

type LookupCapableProviderAdapter = IProviderAdapter & {
  lookupRunRef: NonNullable<IProviderAdapter['lookupRunRef']>;
};

export class PendingIntentReconciliationPolicy {
  constructor(private readonly deps: PendingIntentReconciliationPolicyDeps) {}

  async reconcile(
    intent: OrphanedIntent,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const existingMeta = await this.getRunMetadata(intent);
    const adapter = this.deps.adapters.get(intent.provider);

    if (!this.hasLookupRunRef(adapter)) {
      return this.deferLookupUnsupported(intent, existingMeta !== null, traceContext);
    }

    const lookupResult = await this.lookupRunRef(intent, traceContext, adapter);
    if (lookupResult.kind === 'deferred') {
      return { deferred: intent.intentId };
    }
    if (lookupResult.runRef !== null) {
      return this.expireAfterCancel(intent, lookupResult.runRef, traceContext, adapter);
    }
    return this.handleMissingRunRef(intent, existingMeta !== null, traceContext);
  }

  private async lookupRunRef(
    intent: OrphanedIntent,
    traceContext: RunMaintenanceTraceContext,
    adapter: LookupCapableProviderAdapter
  ): Promise<{ kind: 'ok'; runRef: EngineRunRef | null } | { kind: 'deferred' }> {
    try {
      const runRef = await adapter.lookupRunRef(intent.runId, intent.tenantId);
      return { kind: 'ok', runRef };
    } catch (lookupErr) {
      this.deps.observability.incrementCounter(
        RUN_MAINTENANCE_METRIC.intentDeferredLookupFailedTotal,
        {
          provider: intent.provider,
          operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
        }
      );
      this.deps.observability.warn({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentLookupFailed,
        context: traceContext,
        err: lookupErr,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { kind: 'deferred' };
    }
  }

  private deferLookupUnsupported(
    intent: OrphanedIntent,
    hasBootstrappedRun: boolean,
    traceContext: RunMaintenanceTraceContext
  ): ReconcileOrphanedIntentOutcome {
    this.deps.observability.incrementCounter(
      RUN_MAINTENANCE_METRIC.intentDeferredLookupUnsupportedTotal,
      {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      }
    );
    this.deps.observability.warn({
      msg: RUN_MAINTENANCE_MESSAGE.pendingIntentLookupUnsupported,
      context: traceContext,
      attributes: {
        intentId: intent.intentId,
        runId: intent.runId,
        provider: intent.provider,
        hasBootstrappedRun: String(hasBootstrappedRun),
      },
    });
    return { deferred: intent.intentId };
  }

  private async expireAfterCancel(
    intent: OrphanedIntent,
    runRef: EngineRunRef,
    traceContext: RunMaintenanceTraceContext,
    adapter: IProviderAdapter
  ): Promise<ReconcileOrphanedIntentOutcome> {
    try {
      await adapter.cancelRun(runRef);
      await this.deps.intentStore.markExpired(intent.intentId);
      this.deps.observability.incrementCounter(
        RUN_MAINTENANCE_METRIC.intentExpiredAfterCancelTotal,
        {
          provider: intent.provider,
          operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
        }
      );
      this.deps.observability.info({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentExpiredAfterCancel,
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { expired: intent.intentId };
    } catch (cancelErr) {
      this.deps.observability.error({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentCancelFailed,
        context: traceContext,
        err: cancelErr,
        attributes: { intentId: intent.intentId, runId: intent.runId },
      });
      return { cancelFailed: intent.intentId };
    }
  }

  private async handleMissingRunRef(
    intent: OrphanedIntent,
    hasBootstrappedRun: boolean,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    if (hasBootstrappedRun) {
      this.deps.observability.incrementCounter(
        RUN_MAINTENANCE_METRIC.intentDeferredBootstrappedWithoutWorkflowTotal,
        {
          provider: intent.provider,
          operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
        }
      );
      this.deps.observability.warn({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentBootstrappedWithoutWorkflow,
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { deferred: intent.intentId };
    }

    await this.deps.intentStore.markExpired(intent.intentId);
    this.deps.observability.info({
      msg: RUN_MAINTENANCE_MESSAGE.pendingIntentExpiredNoWorkflow,
      context: traceContext,
      attributes: { intentId: intent.intentId, runId: intent.runId },
    });
    this.deps.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentExpiredTotal, {
      operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
    });
    return { expired: intent.intentId };
  }

  private async getRunMetadata(
    intent: OrphanedIntent
  ): Promise<Awaited<
    ReturnType<RunMaintenanceServiceDeps['stateStoreRead']['getRunMetadataByRunId']>
  > | null> {
    return this.deps.stateStoreRead
      .getRunMetadataByRunId(intent.tenantId, intent.runId)
      .catch(() => null);
  }

  private hasLookupRunRef(
    adapter: IProviderAdapter | undefined
  ): adapter is LookupCapableProviderAdapter {
    return adapter?.lookupRunRef !== undefined;
  }
}
