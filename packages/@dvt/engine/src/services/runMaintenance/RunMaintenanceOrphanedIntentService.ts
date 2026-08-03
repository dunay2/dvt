import { DispatchedIntentReconciliationPolicy } from './DispatchedIntentReconciliationPolicy.js';
import { PendingIntentReconciliationPolicy } from './PendingIntentReconciliationPolicy.js';
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
  private readonly pendingPolicy: PendingIntentReconciliationPolicy;
  private readonly dispatchedPolicy: DispatchedIntentReconciliationPolicy;

  constructor(private readonly deps: RunMaintenanceServiceDeps) {
    this.observability = new RunMaintenanceObservabilityFacade(this.deps.observability);
    this.pendingPolicy = new PendingIntentReconciliationPolicy({
      adapters: this.deps.adapters,
      intentStore: this.deps.intentStore,
      stateStoreRead: this.deps.stateStoreRead,
      stateStoreWrite: this.deps.stateStoreWrite,
      observability: this.observability,
    });
    this.dispatchedPolicy = new DispatchedIntentReconciliationPolicy({
      adapters: this.deps.adapters,
      intentStore: this.deps.intentStore,
      stateStoreRead: this.deps.stateStoreRead,
      observability: this.observability,
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

    for (const intent of orphaned) {
      if (dryRun) {
        // Dry-run is read-only; report inspected intents as deferred because reconciliation
        // is intentionally not executed and no state transition can be applied.
        deferred.push(intent.intentId);
        continue;
      }
      const outcome = await this.reconcileIntent(intent, traceContext);
      if (outcome.expired !== undefined) expired.push(outcome.expired);
      if (outcome.resolved !== undefined) resolved.push(outcome.resolved);
      if (outcome.cancelled !== undefined) cancelled.push(outcome.cancelled);
      if (outcome.cancelFailed !== undefined) cancelFailed.push(outcome.cancelFailed);
      if (outcome.deferred !== undefined) deferred.push(outcome.deferred);
      if (outcome.readyToDispatch !== undefined) deferred.push(outcome.readyToDispatch);
    }

    return { inspected: orphaned.length, expired, resolved, cancelled, cancelFailed, deferred };
  }

  async reconcileStartRunIntent(
    options: ReconcileStartRunIntentOptions
  ): Promise<ReconcileStartRunIntentResult> {
    await this.deps.authorizer.assertTenantAccess(options.tenantId);
    const intent = await this.deps.intentStore.getIntent(options);
    if (intent === null) return { kind: 'missing' };
    if (intent.status === 'RESOLVED') return { kind: 'confirmed' };
    if (intent.status === 'EXPIRED') return { kind: 'blocked' };

    const outcome = await this.reconcileIntent(intent, buildMaintenanceContext(options.tenantId));
    if (outcome.resolved !== undefined) return { kind: 'confirmed' };
    if (outcome.readyToDispatch !== undefined) return { kind: 'ready_to_dispatch' };
    return { kind: 'blocked' };
  }

  private reconcileIntent(
    intent: OrphanedIntent,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    if (intent.status === RUN_MAINTENANCE_INTENT_STATUS.pending) {
      return this.pendingPolicy.reconcile(intent, traceContext);
    }
    if (intent.status === RUN_MAINTENANCE_INTENT_STATUS.dispatched) {
      return this.dispatchedPolicy.reconcile(intent, traceContext);
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
