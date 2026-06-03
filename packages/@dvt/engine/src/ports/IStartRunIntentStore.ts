/**
 * @file packages/@dvt/engine/src/ports/IStartRunIntentStore.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Canonical command/query contract for start-run intent durability
 * @consequence Engine and adapters share one contract and status vocabulary
 * @version 1.0.0
 * @date 2026-03-05
 */
import type { EngineRunRef } from '@dvt/contracts';

export type StartRunIntentStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'EXPIRED';
export type StartRunIntentTransitionTarget = Exclude<StartRunIntentStatus, 'PENDING'>;

export interface StartRunIntent {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  status: StartRunIntentStatus;
  engineRunRef?: EngineRunRef;
  createdAt: string;
  updatedAt: string;
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

/**
 * Commands mutate intent state.
 */
export interface IStartRunIntentCommandStore {
  /**
   * Creates a new PENDING intent for the given (tenantId, runId).
   *
   * Idempotent on `intentId`: if an intent with the same `intentId` already
   * exists, implementations MUST return the existing record unchanged.
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
  createIntent(input: CreateIntentInput): Promise<StartRunIntent>;
  markDispatched(ref: StartRunIntentRef, engineRunRef: EngineRunRef): Promise<void>;
  markResolved(ref: StartRunIntentRef): Promise<void>;
  markExpired(ref: StartRunIntentRef): Promise<void>;
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
