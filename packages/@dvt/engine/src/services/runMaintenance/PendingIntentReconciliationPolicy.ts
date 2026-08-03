import { readCanonicalRunStatus } from '../../core/lifecycle/coreRuntime.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';

import {
  RUN_MAINTENANCE_MESSAGE,
  RUN_MAINTENANCE_METRIC,
  RUN_MAINTENANCE_OPERATION,
} from './RunMaintenanceDomainConstants.js';

type CanonicalRunStatus = import('@dvt/contracts').CanonicalRunStatus;
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
  'adapters' | 'intentStore' | 'stateStoreRead' | 'stateStoreWrite'
> & {
  observability: RunMaintenanceObservabilityFacade;
};

type LookupCapableProviderAdapter = IProviderAdapter & {
  lookupRunRef: NonNullable<IProviderAdapter['lookupRunRef']>;
};

type RunMetadata = Awaited<
  ReturnType<RunMaintenanceServiceDeps['stateStoreRead']['getRunMetadataByRunId']>
>;

type RunMetadataReadResult =
  | { readonly kind: 'found'; readonly metadata: NonNullable<RunMetadata> }
  | { readonly kind: 'missing' }
  | { readonly kind: 'failed'; readonly error: unknown };

type CanonicalRunStatusReadResult =
  | { readonly kind: 'found'; readonly status: CanonicalRunStatus }
  | { readonly kind: 'failed'; readonly error: unknown };

const TERMINAL_RUN_STATUSES = new Set<CanonicalRunStatus['status']>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export class PendingIntentReconciliationPolicy {
  private readonly projector = new SnapshotProjector();

  constructor(private readonly deps: PendingIntentReconciliationPolicyDeps) {}

  async reconcile(
    intent: OrphanedIntent,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const metadataRead = await this.readRunMetadata(intent);
    if (metadataRead.kind === 'failed') {
      return this.deferMetadataReadFailure(intent, metadataRead.error, traceContext);
    }
    const existingMeta = metadataRead.kind === 'found' ? metadataRead.metadata : null;
    const adapter = this.deps.adapters.get(intent.provider);

    if (!this.hasLookupRunRef(adapter)) {
      return this.deferLookupUnsupported(intent, existingMeta !== null, traceContext);
    }

    const lookupResult = await this.lookupRunRef(intent, traceContext, adapter);
    if (lookupResult.kind === 'deferred') {
      return { deferred: intent.intentId };
    }
    if (lookupResult.runRef !== null) {
      if (existingMeta !== null) {
        return this.adoptBootstrappedWorkflow(intent, lookupResult.runRef, traceContext);
      }
      return this.expireAfterCancel(intent, lookupResult.runRef, traceContext, adapter);
    }
    return this.handleMissingRunRef(intent, existingMeta, traceContext);
  }

  private async adoptBootstrappedWorkflow(
    intent: OrphanedIntent,
    runRef: EngineRunRef,
    traceContext: RunMaintenanceTraceContext
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
      this.deps.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentResolvedTotal, {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      });
      this.deps.observability.info({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentResolvedBootstrapped,
        context: traceContext,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { resolved: intent.intentId };
    } catch (adoptionError) {
      this.deps.observability.error({
        msg: RUN_MAINTENANCE_MESSAGE.pendingIntentAdoptionFailed,
        context: traceContext,
        err: adoptionError,
        attributes: {
          intentId: intent.intentId,
          runId: intent.runId,
          provider: intent.provider,
        },
      });
      return { deferred: intent.intentId };
    }
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
      await this.deps.intentStore.markExpired({
        tenantId: intent.tenantId,
        intentId: intent.intentId,
      });
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
    existingMeta: NonNullable<RunMetadata> | null,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    if (existingMeta !== null) {
      const statusRead = await this.readCanonicalStatus(intent);
      if (statusRead.kind === 'failed') {
        return this.deferRunStateReadFailure(intent, statusRead.error, traceContext);
      }
      if (TERMINAL_RUN_STATUSES.has(statusRead.status.status)) {
        return this.expireTerminalBootstrappedIntent(intent, statusRead.status, traceContext);
      }
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
      return { readyToDispatch: intent.intentId };
    }

    await this.deps.intentStore.markExpired({
      tenantId: intent.tenantId,
      intentId: intent.intentId,
    });
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

  private async readCanonicalStatus(intent: OrphanedIntent): Promise<CanonicalRunStatusReadResult> {
    try {
      return {
        kind: 'found',
        status: await readCanonicalRunStatus({
          stateStoreRead: this.deps.stateStoreRead,
          projector: this.projector,
          tenantId: intent.tenantId,
          runId: intent.runId,
        }),
      };
    } catch (error) {
      return { kind: 'failed', error };
    }
  }

  private async expireTerminalBootstrappedIntent(
    intent: OrphanedIntent,
    status: CanonicalRunStatus,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    await this.deps.intentStore.markExpired({
      tenantId: intent.tenantId,
      intentId: intent.intentId,
    });
    this.deps.observability.incrementCounter(RUN_MAINTENANCE_METRIC.intentExpiredTotal, {
      operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
    });
    this.deps.observability.info({
      msg: RUN_MAINTENANCE_MESSAGE.pendingIntentExpiredTerminalRun,
      context: traceContext,
      attributes: {
        intentId: intent.intentId,
        runId: intent.runId,
        status: status.status,
      },
    });
    return { expired: intent.intentId };
  }

  private deferRunStateReadFailure(
    intent: OrphanedIntent,
    error: unknown,
    traceContext: RunMaintenanceTraceContext
  ): ReconcileOrphanedIntentOutcome {
    this.deps.observability.incrementCounter(
      RUN_MAINTENANCE_METRIC.intentDeferredRunStateReadFailedTotal,
      {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      }
    );
    this.deps.observability.warn({
      msg: RUN_MAINTENANCE_MESSAGE.pendingIntentRunStateReadFailed,
      context: traceContext,
      err: error,
      attributes: {
        intentId: intent.intentId,
        runId: intent.runId,
        provider: intent.provider,
      },
    });
    return { deferred: intent.intentId };
  }

  private async readRunMetadata(intent: OrphanedIntent): Promise<RunMetadataReadResult> {
    try {
      const metadata = await this.deps.stateStoreRead.getRunMetadataByRunId(
        intent.tenantId,
        intent.runId
      );
      return metadata === null ? { kind: 'missing' } : { kind: 'found', metadata };
    } catch (error) {
      return { kind: 'failed', error };
    }
  }

  private deferMetadataReadFailure(
    intent: OrphanedIntent,
    error: unknown,
    traceContext: RunMaintenanceTraceContext
  ): ReconcileOrphanedIntentOutcome {
    this.deps.observability.incrementCounter(
      RUN_MAINTENANCE_METRIC.intentDeferredMetadataReadFailedTotal,
      {
        provider: intent.provider,
        operation: RUN_MAINTENANCE_OPERATION.reconcileOrphanedIntents,
      }
    );
    this.deps.observability.warn({
      msg: RUN_MAINTENANCE_MESSAGE.pendingIntentMetadataReadFailed,
      context: traceContext,
      err: error,
      attributes: {
        intentId: intent.intentId,
        runId: intent.runId,
        provider: intent.provider,
      },
    });
    return { deferred: intent.intentId };
  }

  private hasLookupRunRef(
    adapter: IProviderAdapter | undefined
  ): adapter is LookupCapableProviderAdapter {
    return adapter?.lookupRunRef !== undefined;
  }
}
