/** @baseline ADR-0030 @ownedConcern Apply owner-fenced reconciliation effects in their required order. */
import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import { requireStartRunMutation } from '../../domain/startRunIntentPolicy.js';
import type { StartRunIntentClaimReceipt } from '../../ports/IStartRunIntentStore.js';

import type { StartRunReconciliationDecision } from './decideStartRunIntentReconciliation.js';
import type {
  OrphanedIntent,
  ReconcileOrphanedIntentOutcome,
  RunMaintenanceServiceDeps,
} from './RunMaintenanceContracts.js';

type EffectDeps = Pick<RunMaintenanceServiceDeps, 'intentStore' | 'stateStoreWrite'>;

export class StartRunIntentReconciliationEffects {
  constructor(private readonly deps: EffectDeps) {}

  async apply(
    decision: StartRunReconciliationDecision,
    intent: OrphanedIntent,
    receipt: StartRunIntentClaimReceipt,
    adapter: IProviderAdapter | undefined
  ): Promise<ReconcileOrphanedIntentOutcome> {
    const { intentStore, stateStoreWrite } = this.deps;
    switch (decision.kind) {
      case 'defer':
        requireStartRunMutation(
          await intentStore.recordReconciliation(receipt, {
            kind: 'defer',
            reason: decision.reason,
          })
        );
        return { deferred: intent.intentId, reasonCode: decision.reason };
      case 'escalate':
        requireStartRunMutation(
          await intentStore.recordReconciliation(receipt, { ...decision, kind: 'escalate' })
        );
        return { escalated: intent.intentId, reasonCode: decision.reason };
      case 'expire':
        requireStartRunMutation(await intentStore.markExpired(receipt));
        return { expired: intent.intentId };
      case 'adopt':
      case 'resolve_terminal':
        requireStartRunMutation(await intentStore.markDispatched(receipt, decision.runRef));
        if (decision.kind === 'adopt')
          requireStartRunMutation(
            await stateStoreWrite.applyStartRunWrite(receipt, {
              kind: 'bind_provider',
              providerRef: decision.runRef,
            })
          );
        requireStartRunMutation(await intentStore.markResolved(receipt));
        return { resolved: intent.intentId };
      case 'confirm':
      case 'cancel': {
        if (intent.providerOutcome.kind !== 'started')
          requireStartRunMutation(
            await intentStore.markDispatched(receipt, decision.target.runRef)
          );
        requireStartRunMutation(
          await intentStore.recordReconciliation(receipt, {
            kind: 'require_compensation',
            reason: decision.kind === 'cancel' ? decision.reason : 'orphaned_provider',
          })
        );
        if (decision.kind === 'confirm') {
          requireStartRunMutation(
            await intentStore.recordReconciliation(receipt, {
              kind: 'confirm_compensation',
              executionId: decision.target.executionId,
              disposition: decision.disposition,
            })
          );
          return { cancelled: intent.intentId };
        }
        if (!adapter) throw new Error('START_RECONCILIATION_ADAPTER_UNAVAILABLE');
        // Persist attempt/backoff and validate current authority before the RPC.
        requireStartRunMutation(
          await intentStore.recordReconciliation(receipt, {
            kind: 'authorize_cancel',
            executionId: decision.target.executionId,
          })
        );
        try {
          await adapter.cancelRun(decision.target.runRef, decision.target.executionId);
          return { deferred: intent.intentId, reasonCode: 'cancel_requested' };
        } catch {
          requireStartRunMutation(
            await intentStore.recordReconciliation(receipt, { kind: 'cancel_failed' })
          );
          return { cancelFailed: intent.intentId, reasonCode: 'cancel_failed' };
        }
      }
    }
  }
}
