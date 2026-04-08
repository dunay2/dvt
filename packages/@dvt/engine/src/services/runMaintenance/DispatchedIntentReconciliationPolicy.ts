import {
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
  RUN_MAINTENANCE_OPERATION,
} from './RunMaintenanceDomainConstants.js';

type OrphanedIntent = import('./RunMaintenanceContracts.js').OrphanedIntent;
type ReconcileOrphanedIntentOutcome =
  import('./RunMaintenanceContracts.js').ReconcileOrphanedIntentOutcome;
type RunMaintenanceServiceDeps = import('./RunMaintenanceContracts.js').RunMaintenanceServiceDeps;
type RunMaintenanceTraceContext = import('./RunMaintenanceContracts.js').RunMaintenanceTraceContext;
type RunMaintenanceObservabilityFacade =
  import('./RunMaintenanceObservabilityFacade.js').RunMaintenanceObservabilityFacade;

type DispatchedIntentReconciliationPolicyDeps = Pick<
  RunMaintenanceServiceDeps,
  'adapters' | 'intentStore' | 'stateStoreRead'
> & {
  observability: RunMaintenanceObservabilityFacade;
};

export class DispatchedIntentReconciliationPolicy {
  constructor(private readonly deps: DispatchedIntentReconciliationPolicyDeps) {}

  async reconcile(
    intent: OrphanedIntent,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const existingMeta = await this.getRunMetadata(intent);

    if (existingMeta !== null) {
      await this.deps.intentStore.markResolved(intent.intentId);
      this.deps.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentResolvedTotal, {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      });
      this.deps.observability.info({
        msg: RUN_MAINTENANCE_MESSAGE.dispatchedIntentResolvedBootstrapped,
        context: traceContext,
        attributes: { intentId: intent.intentId, runId: intent.runId },
      });
      return { resolved: intent.intentId };
    }

    const adapter = this.deps.adapters.get(intent.provider);
    if (adapter === undefined || intent.engineRunRef === undefined) {
      this.deps.observability.error({
        msg: RUN_MAINTENANCE_MESSAGE.dispatchedIntentMissingAdapterOrRef,
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
          hasRunRef: String(intent.engineRunRef !== undefined),
        },
      });
      return { cancelFailed: intent.intentId };
    }

    try {
      await adapter.cancelRun(intent.engineRunRef);
      await this.deps.intentStore.markResolved(intent.intentId);
      this.deps.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentCancelledTotal, {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      });
      this.deps.observability.info({
        msg: RUN_MAINTENANCE_MESSAGE.dispatchedIntentCancelled,
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { cancelled: intent.intentId };
    } catch (cancelErr) {
      this.deps.observability.error({
        msg: RUN_MAINTENANCE_MESSAGE.dispatchedIntentCancelFailed,
        context: traceContext,
        err: cancelErr,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
        },
      });
      return { cancelFailed: intent.intentId };
    }
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
}
