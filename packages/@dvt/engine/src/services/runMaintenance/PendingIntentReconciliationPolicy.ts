/** @ownedConcern Gather ordered reconciliation observations and sequence the selected effect. */
import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import { readCanonicalRunStatus } from '../../core/lifecycle/coreRuntime.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import { readStartRunAuthority } from '../startRun/readStartRunAuthority.js';

import {
  decidePendingIntentReconciliation,
  type PendingIntentObservation,
} from './decidePendingIntentReconciliation.js';
import { PendingIntentReconciliationEffects } from './PendingIntentReconciliationEffects.js';
import type {
  OrphanedIntent,
  ReconcileOrphanedIntentOutcome,
  RunMaintenanceServiceDeps,
  RunMaintenanceTraceContext,
} from './RunMaintenanceContracts.js';
import type { RunMaintenanceObservabilityFacade } from './RunMaintenanceObservabilityFacade.js';

type PendingIntentReconciliationPolicyDeps = Pick<
  RunMaintenanceServiceDeps,
  'adapters' | 'intentStore' | 'stateStoreRead' | 'stateStoreWrite'
> & { observability: RunMaintenanceObservabilityFacade };

export class PendingIntentReconciliationPolicy {
  private readonly projector = new SnapshotProjector();
  private readonly effects: PendingIntentReconciliationEffects;

  constructor(private readonly deps: PendingIntentReconciliationPolicyDeps) {
    this.effects = new PendingIntentReconciliationEffects({
      intentStore: deps.intentStore,
      stateStoreWrite: deps.stateStoreWrite,
      observability: deps.observability,
    });
  }

  async reconcile(
    intent: OrphanedIntent,
    traceContext: RunMaintenanceTraceContext
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const metadata = await readStartRunAuthority(() =>
      this.deps.stateStoreRead.getRunMetadataByRunId(intent.tenantId, intent.runId)
    );
    if (metadata.kind === 'failed') {
      return this.effects.apply(
        decidePendingIntentReconciliation({ kind: 'metadata_failed', error: metadata.error }),
        intent,
        traceContext,
        undefined
      );
    }
    const adapter = this.deps.adapters.get(intent.provider);
    const observation = await this.observeProvider(intent, metadata.kind === 'found', adapter);
    return this.effects.apply(
      decidePendingIntentReconciliation(observation),
      intent,
      traceContext,
      adapter
    );
  }

  private async observeProvider(
    intent: OrphanedIntent,
    hasBootstrappedRun: boolean,
    adapter: IProviderAdapter | undefined
  ): Promise<PendingIntentObservation> {
    const lookupRunRef = adapter?.lookupRunRef?.bind(adapter);
    if (lookupRunRef === undefined) return { kind: 'lookup_unsupported', hasBootstrappedRun };
    const lookup = await readStartRunAuthority(() => lookupRunRef(intent.runId, intent.tenantId));
    if (lookup.kind === 'failed') return { kind: 'lookup_failed', error: lookup.error };
    if (lookup.kind === 'found')
      return { kind: 'workflow_found', hasBootstrappedRun, runRef: lookup.value };
    if (!hasBootstrappedRun) return { kind: 'workflow_missing', status: null };
    try {
      const status = await readCanonicalRunStatus({
        stateStoreRead: this.deps.stateStoreRead,
        projector: this.projector,
        tenantId: intent.tenantId,
        runId: intent.runId,
      });
      return { kind: 'workflow_missing', status: status.status };
    } catch (error) {
      return { kind: 'status_failed', error };
    }
  }
}
