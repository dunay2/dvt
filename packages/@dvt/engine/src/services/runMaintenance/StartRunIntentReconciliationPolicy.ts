/** @baseline ADR-0030 @ownedConcern Observe canonical/provider authority and delegate pure decisions and fenced effects. */
import { readCanonicalRunStatus } from '../../core/lifecycle/coreRuntime.js';
import { SnapshotProjector } from '../../core/SnapshotProjector.js';
import { StartRunIntentMutationRejectedError } from '../../domain/startRunIntentPolicy.js';
import type { StartRunIntentClaimReceipt } from '../../ports/IStartRunIntentStore.js';
import { readStartRunAuthority } from '../startRun/readStartRunAuthority.js';

import {
  decideStartRunIntentReconciliation,
  type StartRunReconciliationObservation,
} from './decideStartRunIntentReconciliation.js';
import type {
  OrphanedIntent,
  ReconcileOrphanedIntentOutcome,
  RunMaintenanceServiceDeps,
} from './RunMaintenanceContracts.js';
import { StartRunIntentReconciliationEffects } from './StartRunIntentReconciliationEffects.js';

export class StartRunIntentReconciliationPolicy {
  private readonly projector = new SnapshotProjector();
  private readonly effects: StartRunIntentReconciliationEffects;

  constructor(
    private readonly deps: Pick<
      RunMaintenanceServiceDeps,
      'adapters' | 'intentStore' | 'stateStoreRead' | 'stateStoreWrite'
    >
  ) {
    this.effects = new StartRunIntentReconciliationEffects(deps);
  }

  async reconcile(
    intent: OrphanedIntent,
    receipt: StartRunIntentClaimReceipt
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const decision = decideStartRunIntentReconciliation(intent, await this.observe(intent));
    try {
      return await this.effects.apply(
        decision,
        intent,
        receipt,
        this.deps.adapters.get(intent.provider)
      );
    } catch (error) {
      if (error instanceof StartRunIntentMutationRejectedError)
        return { deferred: intent.intentId };
      // Persist a bounded retry only if authority/storage are still available.
      try {
        return await this.effects.apply(
          decideStartRunIntentReconciliation(intent, { kind: 'failed', reason: 'adoption_failed' }),
          intent,
          receipt,
          undefined
        );
      } catch {
        return { deferred: intent.intentId };
      }
    }
  }

  private async observe(intent: OrphanedIntent): Promise<StartRunReconciliationObservation> {
    const metadata = await readStartRunAuthority(() =>
      this.deps.stateStoreRead.getRunMetadataByRunId(intent.tenantId, intent.runId)
    );
    if (metadata.kind === 'failed') return { kind: 'failed', reason: 'metadata_failed' };
    let canonical: Extract<StartRunReconciliationObservation, { kind: 'known' }>['canonical'] =
      null;
    if (metadata.kind === 'found') {
      try {
        canonical = (
          await readCanonicalRunStatus({
            stateStoreRead: this.deps.stateStoreRead,
            projector: this.projector,
            tenantId: intent.tenantId,
            runId: intent.runId,
          })
        ).status;
      } catch {
        return { kind: 'failed', reason: 'status_failed' };
      }
    }
    const adapter = this.deps.adapters.get(intent.provider);
    if (!adapter?.observeStartRun) return { kind: 'failed', reason: 'provider_unsupported' };
    try {
      return {
        kind: 'known',
        canonical,
        provider: await adapter.observeStartRun(intent.runId, intent.tenantId),
      };
    } catch {
      return { kind: 'failed', reason: 'provider_failed' };
    }
  }
}
