import type {
  ReconcileOrphanedIntentsOptions,
  ReconcileOrphanedIntentsResult,
} from '../../ports/IRunMaintenanceService.js';

import {
  buildMaintenanceContext,
  type OrphanedIntent,
  type ReconcileOrphanedIntentOutcome,
  type RunMaintenanceServiceDeps,
} from './RunMaintenanceContracts.js';
import {
  RUN_MAINTENANCE_CONTEXT,
  RUN_MAINTENANCE_INTENT_STATUS,
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
  RUN_MAINTENANCE_NUMERIC,
  RUN_MAINTENANCE_OPERATION,
} from './RunMaintenanceDomainConstants.js';

export class RunMaintenanceOrphanedIntentService {
  constructor(private readonly deps: RunMaintenanceServiceDeps) {}

  async reconcileOrphanedIntents(
    options: ReconcileOrphanedIntentsOptions
  ): Promise<ReconcileOrphanedIntentsResult> {
    const { thresholdMs, limit, dryRun } = options;
    const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
    const traceContext = buildMaintenanceContext(RUN_MAINTENANCE_CONTEXT.systemTenantId);

    const orphaned = await this.deps.intentStore.listOrphaned(
      thresholdMs,
      nowMs,
      limit ?? RUN_MAINTENANCE_NUMERIC.defaultLimit
    );

    const expired: string[] = [];
    const cancelled: string[] = [];
    const cancelFailed: string[] = [];
    const deferred: string[] = [];

    for (const intent of orphaned) {
      if (dryRun) continue;

      const outcome = await this.reconcileOrphanedIntent(intent, traceContext);
      if (outcome.expired !== undefined) {
        expired.push(outcome.expired);
      }
      if (outcome.cancelled !== undefined) {
        cancelled.push(outcome.cancelled);
      }
      if (outcome.cancelFailed !== undefined) {
        cancelFailed.push(outcome.cancelFailed);
      }
      if (outcome.deferred !== undefined) {
        deferred.push(outcome.deferred);
      }
    }

    return { inspected: orphaned.length, expired, cancelled, cancelFailed, deferred };
  }

  private async reconcileOrphanedIntent(
    intent: OrphanedIntent,
    traceContext: ReturnType<typeof buildMaintenanceContext>
  ): Promise<ReconcileOrphanedIntentOutcome> {
    if (intent.status === RUN_MAINTENANCE_INTENT_STATUS.pending) {
      return this.reconcilePendingOrphanedIntent(intent, traceContext);
    }

    if (intent.status === RUN_MAINTENANCE_INTENT_STATUS.dispatched) {
      return this.reconcileDispatchedOrphanedIntent(intent, traceContext);
    }

    return {};
  }

  private async reconcilePendingOrphanedIntent(
    intent: OrphanedIntent,
    traceContext: ReturnType<typeof buildMaintenanceContext>
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const existingMeta = await this.deps.stateStoreRead
      .getRunMetadataByRunId(intent.tenantId, intent.runId)
      .catch(() => null);

    const adapter = this.deps.adapters.get(intent.provider);

    if (adapter?.lookupRunRef === undefined) {
      this.safeIncrementCounter(RUN_MAINTENANCE_METRIC.intentDeferredLookupUnsupportedTotal, {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      });
      this.safeLogWarn({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentLookupUnsupported,
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
          hasBootstrappedRun: String(existingMeta !== null),
        },
      });
      return { deferred: intent.intentId };
    }

    let runRef: typeof intent.engineRunRef | null = null;
    try {
      runRef = await adapter.lookupRunRef(intent.runId, intent.tenantId);
    } catch (lookupErr) {
      this.safeIncrementCounter(RUN_MAINTENANCE_METRIC.intentDeferredLookupFailedTotal, {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      });
      this.safeLogWarn({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentLookupFailed,
        context: traceContext,
        err: lookupErr,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { deferred: intent.intentId };
    }

    if (runRef !== null) {
      try {
        await adapter.cancelRun(runRef);
        await this.deps.intentStore.markExpired(intent.intentId);
        this.safeIncrementCounter(RUN_MAINTENANCE_METRIC.intentExpiredAfterCancelTotal, {
          provider: intent.provider,
          operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
        });
        this.safeLogInfo({
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
        this.safeLogError({
          msg: RUN_MAINTENANCE_MESSAGE.pendingIntentCancelFailed,
          context: traceContext,
          err: cancelErr,
          attributes: { intentId: intent.intentId, runId: intent.runId },
        });
        return { cancelFailed: intent.intentId };
      }
    }

    if (existingMeta !== null) {
      this.safeIncrementCounter(
        RUN_MAINTENANCE_METRIC.intentDeferredBootstrappedWithoutWorkflowTotal,
        {
          provider: intent.provider,
          operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
        }
      );
      this.safeLogWarn({
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
    this.safeLogInfo({
      msg: RUN_MAINTENANCE_MESSAGE.pendingIntentExpiredNoWorkflow,
      context: traceContext,
      attributes: { intentId: intent.intentId, runId: intent.runId },
    });
    this.safeIncrementCounter(RUN_MAINTENANCE_METRIC.intentExpiredTotal, {
      operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
    });
    return { expired: intent.intentId };
  }

  private async reconcileDispatchedOrphanedIntent(
    intent: OrphanedIntent,
    traceContext: ReturnType<typeof buildMaintenanceContext>
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const existingMeta = await this.deps.stateStoreRead
      .getRunMetadataByRunId(intent.tenantId, intent.runId)
      .catch(() => null);

    if (existingMeta !== null) {
      await this.deps.intentStore.markResolved(intent.intentId);
      this.safeLogInfo({
        msg: RUN_MAINTENANCE_MESSAGE.dispatchedIntentResolvedBootstrapped,
        context: traceContext,
        attributes: { intentId: intent.intentId, runId: intent.runId },
      });
      return { cancelled: intent.intentId };
    }

    const adapter = this.deps.adapters.get(intent.provider);
    if (adapter === undefined || intent.engineRunRef === undefined) {
      this.safeLogError({
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
      this.safeIncrementCounter(RUN_MAINTENANCE_METRIC.intentCancelledTotal, {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      });
      this.safeLogInfo({
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
      this.safeLogError({
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

  private safeIncrementCounter(name: string, labels: Readonly<Record<string, string>>): void {
    try {
      this.deps.observability.metrics
        .counter(name, labels)
        .add(RUN_MAINTENANCE_NUMERIC.metricIncrement);
    } catch {
      // no-op
    }
  }

  private safeLogInfo(
    entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['info']>[0]
  ): void {
    try {
      this.deps.observability.logs.info(entry);
    } catch {
      // no-op
    }
  }

  private safeLogWarn(
    entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['warn']>[0]
  ): void {
    try {
      this.deps.observability.logs.warn(entry);
    } catch {
      // no-op
    }
  }

  private safeLogError(
    entry: Parameters<RunMaintenanceServiceDeps['observability']['logs']['error']>[0]
  ): void {
    try {
      this.deps.observability.logs.error(entry);
    } catch {
      // no-op
    }
  }
}
