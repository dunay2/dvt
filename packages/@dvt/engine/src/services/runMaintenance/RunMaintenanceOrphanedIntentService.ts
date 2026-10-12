import { StartRunIntentMutationRejectedError } from '../../domain/startRunIntentPolicy.js';

import { buildMaintenanceContext } from './RunMaintenanceContracts.js';
import {
  RUN_MAINTENANCE_CONTEXT,
  RUN_MAINTENANCE_INTENT_STATUS,
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
  RUN_MAINTENANCE_NUMERIC,
  RUN_MAINTENANCE_OPERATION,
} from './RunMaintenanceDomainConstants.js';
import { RunMaintenanceObservabilityFacade } from './RunMaintenanceObservabilityFacade.js';
import { StartRunIntentReconciliationPolicy } from './StartRunIntentReconciliationPolicy.js';
type ReconcileOrphanedIntentsOptions =
  import('../../ports/IRunMaintenanceService.js').ReconcileOrphanedIntentsOptions;
type ReconcileOrphanedIntentsResult =
  import('../../ports/IRunMaintenanceService.js').ReconcileOrphanedIntentsResult;
type ReconcileStartRunIntentOptions =
  import('../../ports/IRunMaintenanceService.js').ReconcileStartRunIntentOptions;
type ReconcileStartRunIntentResult =
  import('../../ports/IRunMaintenanceService.js').ReconcileStartRunIntentResult;
type OrphanedIntent = import('./RunMaintenanceContracts.js').OrphanedIntent;
type ReconcileOrphanedIntentOutcome =
  import('./RunMaintenanceContracts.js').ReconcileOrphanedIntentOutcome;
type RunMaintenanceServiceDeps = import('./RunMaintenanceContracts.js').RunMaintenanceServiceDeps;
type RunMaintenanceTraceContext = import('./RunMaintenanceContracts.js').RunMaintenanceTraceContext;

export class RunMaintenanceOrphanedIntentService {
  private readonly observability: RunMaintenanceObservabilityFacade;
  private readonly policy: StartRunIntentReconciliationPolicy;

  constructor(private readonly deps: RunMaintenanceServiceDeps) {
    this.observability = new RunMaintenanceObservabilityFacade(this.deps.observability);
    this.policy = new StartRunIntentReconciliationPolicy({
      adapters: this.deps.adapters,
      intentStore: this.deps.intentStore,
      stateStoreRead: this.deps.stateStoreRead,
      stateStoreWrite: this.deps.stateStoreWrite,
    });
  }

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
    const resolved: string[] = [];
    const cancelled: string[] = [];
    const cancelFailed: string[] = [];
    const deferred: string[] = [];
    const escalated: string[] = [];

    for (const intent of orphaned) {
      if (dryRun) {
        // Dry-run is read-only; report inspected intents as deferred because reconciliation
        // is intentionally not executed and no state transition can be applied.
        deferred.push(intent.intentId);
        continue;
      }
      const outcome = await this.reconcileIntent(intent, traceContext, thresholdMs);
      if (outcome.expired !== undefined) expired.push(outcome.expired);
      if (outcome.resolved !== undefined) resolved.push(outcome.resolved);
      if (outcome.cancelled !== undefined) cancelled.push(outcome.cancelled);
      if (outcome.cancelFailed !== undefined) cancelFailed.push(outcome.cancelFailed);
      if (outcome.deferred !== undefined) deferred.push(outcome.deferred);
      if (outcome.escalated !== undefined) escalated.push(outcome.escalated);
    }

    return {
      inspected: orphaned.length,
      expired,
      resolved,
      cancelled,
      cancelFailed,
      deferred,
      escalated,
    };
  }

  async reconcileStartRunIntent(
    options: ReconcileStartRunIntentOptions
  ): Promise<ReconcileStartRunIntentResult> {
    await this.deps.authorizer.assertTenantAccess(options.tenantId);
    const intent = await this.deps.intentStore.getIntent(options);
    if (intent === null) return { kind: 'missing' };
    if (intent.reconciliation.kind === 'escalated') return { kind: 'escalated' };
    if (intent.status === 'RESOLVED')
      return {
        kind:
          intent.compensation.kind === 'not_required' && intent.providerOutcome.kind === 'started'
            ? 'confirmed'
            : 'blocked',
      };
    if (intent.status === 'EXPIRED') return { kind: 'blocked' };

    const outcome = await this.reconcileIntent(
      intent,
      buildMaintenanceContext(options.tenantId),
      options.minimumAgeMs ?? RUN_MAINTENANCE_NUMERIC.defaultIntentReclaimAgeMs
    );
    if (outcome.resolved !== undefined) return { kind: 'confirmed' };
    if (outcome.escalated !== undefined) return { kind: 'escalated' };
    return { kind: 'blocked' };
  }

  private async reconcileIntent(
    intent: OrphanedIntent,
    traceContext: RunMaintenanceTraceContext,
    minimumAgeMs: number
  ): Promise<ReconcileOrphanedIntentOutcome> {
    try {
      if (
        intent.status === RUN_MAINTENANCE_INTENT_STATUS.pending ||
        intent.status === RUN_MAINTENANCE_INTENT_STATUS.dispatched
      ) {
        const claim = await this.deps.intentStore.reclaimIntent({
          tenantId: intent.tenantId,
          intentId: intent.intentId,
          expectedRevision: intent.revision,
          minimumAgeMs,
        });
        if (claim.kind !== 'acquired') return { deferred: intent.intentId };
        const outcome = await this.policy.reconcile(claim.intent, claim.receipt);
        const disposition = outcome.escalated
          ? 'escalated'
          : outcome.cancelFailed
            ? 'cancel_failed'
            : outcome.cancelled
              ? 'cancelled'
              : outcome.resolved
                ? 'resolved'
                : outcome.expired
                  ? 'expired'
                  : 'deferred';
        this.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentReconciliationTotal, {
          provider: intent.provider,
          outcome: disposition,
          reasonCode: outcome.reasonCode ?? 'none',
        });
        if (outcome.resolved)
          this.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentResolvedTotal, {
            provider: intent.provider,
          });
        const entry = {
          msg: RUN_MAINTENANCE_MESSAGE.intentReconciliationObserved,
          context: { ...traceContext, tenantId: intent.tenantId, runId: intent.runId },
          attributes: {
            intentId: intent.intentId,
            outcome: disposition,
            reasonCode: outcome.reasonCode ?? 'none',
          },
        };
        if (outcome.escalated || outcome.cancelFailed || outcome.deferred)
          this.observability.warn(entry);
        else this.observability.info(entry);
        return outcome;
      }
    } catch (error) {
      if (error instanceof StartRunIntentMutationRejectedError)
        return { deferred: intent.intentId };
      throw error;
    }
    this.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentUnexpectedStatusTotal, {
      operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
    });
    this.observability.warn({
      msg: RUN_MAINTENANCE_MESSAGE.unexpectedIntentStatus,
      context: traceContext,
      attributes: {
        intentId: intent.intentId,
        runId: intent.runId,
        provider: intent.provider,
        status: intent.status,
      },
    });
    return Promise.resolve({});
  }
}
