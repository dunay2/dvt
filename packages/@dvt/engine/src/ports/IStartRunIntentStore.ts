/**
 * @file packages/@dvt/engine/src/ports/IStartRunIntentStore.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Canonical command/query contract for start-run intent durability
 * @consequence Engine and adapters share one contract and status vocabulary
 * @version 1.0.0
 * @date 2026-03-05
 */
import type { EngineRunRef } from '@dvt/contracts';

import type { ProviderRunObservation } from '../adapters/IProviderAdapter.js';

export type StartRunIntentStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'EXPIRED';
export type StartRunIntentTransitionTarget = Exclude<StartRunIntentStatus, 'PENDING'>;

/** Provider knowledge is independent of acquisition and lifecycle state. */
export type ProviderStartOutcome =
  | { kind: 'not_requested' }
  | { kind: 'unknown'; reasonCode: 'start_requested'; since: string }
  | { kind: 'started'; runRef: EngineRunRef };

export type StartRunCompensationReason =
  'bootstrap_failed' | 'provider_ref_failed' | 'orphaned_provider' | 'terminal_canonical';
export type StartRunReconciliationReason =
  | 'metadata_failed'
  | 'status_failed'
  | 'provider_failed'
  | 'provider_unsupported'
  | 'provider_missing'
  | 'cancel_requested'
  | 'cancel_failed'
  | 'adoption_failed'
  | 'terminal_orphan'
  | 'execution_changed'
  | 'canonical_not_terminal';
export type StartRunCompensationState =
  | { kind: 'not_required' }
  | { kind: 'required'; reason: StartRunCompensationReason; since: string; executionId?: string }
  | {
      kind: 'confirmed';
      executionId: string;
      disposition: 'cancelled' | 'terminated';
      confirmedAt: string;
    };
export type StartRunReconciliationState =
  | {
      kind: 'pending';
      attempts: number;
      nextAttemptAt: string;
      reason?: StartRunReconciliationReason;
    }
  | {
      kind: 'escalated';
      attempts: number;
      reason: StartRunReconciliationReason;
      since: string;
      observation?: ProviderRunObservation;
    };
export type ReconciliationCommand =
  | { kind: 'require_compensation'; reason: StartRunCompensationReason }
  | { kind: 'authorize_cancel'; executionId: string }
  | { kind: 'cancel_failed' }
  | { kind: 'confirm_compensation'; executionId: string; disposition: 'cancelled' | 'terminated' }
  | { kind: 'defer'; reason: StartRunReconciliationReason }
  | {
      kind: 'escalate';
      reason: StartRunReconciliationReason;
      observation?: ProviderRunObservation;
    };

export interface StartRunIntent {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  status: StartRunIntentStatus;
  providerOutcome: ProviderStartOutcome;
  compensation: StartRunCompensationState;
  reconciliation: StartRunReconciliationState;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface CreateIntentInput {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  createdAt: string;
}

export interface StartRunIntentRef {
  tenantId: string;
  intentId: string;
}

/** Opaque acquisition authority; never include the token in a query or diagnostic. */
export interface StartRunIntentClaimReceipt extends StartRunIntentRef {
  readonly runId: string;
  readonly token: string;
}

export type StartRunIntentClaimResult =
  | { kind: 'acquired'; intent: StartRunIntent; receipt: StartRunIntentClaimReceipt }
  | { kind: 'existing'; intent: StartRunIntent };

export type StartRunIntentMutationResult =
  'applied' | 'already_applied' | 'not_owner' | 'invalid_state' | 'missing' | 'conflict';

export interface ReclaimStartRunIntentInput extends StartRunIntentRef {
  expectedRevision: number;
  minimumAgeMs: number;
}

export type ReclaimStartRunIntentResult =
  | { kind: 'acquired'; intent: StartRunIntent; receipt: StartRunIntentClaimReceipt }
  | { kind: 'not_acquired' };

/**
 * Commands mutate intent state.
 */
export interface IStartRunIntentCommandStore {
  /**
   * Creates a new PENDING intent for the given (tenantId, runId).
   *
   * Exactly one caller receives acquisition authority. An existing intent is
   * returned without a receipt and does not grant dispatch permission.
   *
   * INV-INTENT-011: Callers MUST derive `intentId` deterministically from
   * (tenantId, runId) so that a scheduler crash-restart produces the same
   * `intentId` and the idempotency guarantee absorbs the retry. Generating a
   * fresh UUID on every call breaks this guarantee.
   *
   * Normalization policy: derivation inputs are consumed as-is (no trimming,
   * no case folding, no Unicode normalization). Callers MUST provide canonical
   * tenantId/runId values before derivation.
   *
   * Canonicalization policy: derivation MUST use a versioned canonical payload
   * shape so delimiter collisions do not alter semantic identity.
   *
   * If a different `intentId` is supplied but an active (PENDING or DISPATCHED)
   * intent already exists for the same (tenantId, runId), implementations MUST
   * throw `IntentActiveConflictError` - this indicates a caller bug.
   */
  claimIntent(input: CreateIntentInput): Promise<StartRunIntentClaimResult>;
  /** Maintenance-only CAS; age is checked against the store clock, not a caller timestamp. */
  reclaimIntent(input: ReclaimStartRunIntentInput): Promise<ReclaimStartRunIntentResult>;
  /** Only applied grants one dispatch. Unknown outcome survives timeout, process loss and reclaim. */
  authorizeDispatch(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult>;
  /** Durable, owner-fenced reconciliation; cancellation acknowledgement is never resolution. */
  recordReconciliation(
    receipt: StartRunIntentClaimReceipt,
    command: ReconciliationCommand
  ): Promise<StartRunIntentMutationResult>;
  markDispatched(
    receipt: StartRunIntentClaimReceipt,
    engineRunRef: EngineRunRef
  ): Promise<StartRunIntentMutationResult>;
  markResolved(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult>;
  markExpired(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult>;
}

/**
 * Queries read intent state without mutation.
 */
export interface IStartRunIntentQueryStore {
  listOrphaned(thresholdMs: number, nowMs: number, limit?: number): Promise<StartRunIntent[]>;
  getIntent(ref: StartRunIntentRef): Promise<StartRunIntent | null>;
}

export interface IStartRunIntentStore
  extends IStartRunIntentCommandStore, IStartRunIntentQueryStore {}
