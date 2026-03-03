/**
 * @file packages/@dvt/engine/src/ports/IStartRunIntentStore.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0013: bootstrapRunTx atomicity
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Pre-dispatch intent log prevents orphaned provider workflows on process crash
 * @consequence Reconciliation can detect and cancel provider workflows that were never bootstrapped
 * @version 1.0.0
 * @date 2026-03-03
 */
import type { EngineRunRef } from '@dvt/contracts';

/**
 * Lifecycle of a startRun intent:
 *
 *   PENDING ──adapter.startRun()──▶ DISPATCHED ──bootstrapRunTx()──▶ RESOLVED
 *       │                               │
 *       └── reconcile (expire) ──▶ EXPIRED
 *                                       └── reconcile (cancel) ──▶ RESOLVED
 */
export type StartRunIntentStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'EXPIRED';

export interface StartRunIntent {
  intentId: string;
  tenantId: string;
  runId: string;
  provider: EngineRunRef['provider'];
  status: StartRunIntentStatus;
  /**
   * Engine run reference set after adapter.startRun() returns.
   * Undefined while status is PENDING.
   */
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

export interface IStartRunIntentStore {
  /**
   * Persist a new intent in PENDING status.
   * MUST be called BEFORE adapter.startRun().
   * MUST be idempotent on intentId (re-insert of same intentId returns existing).
   */
  createIntent(input: CreateIntentInput): Promise<StartRunIntent>;

  /**
   * Transition intent from PENDING to DISPATCHED, attaching the engineRunRef.
   * MUST be called immediately after adapter.startRun() returns successfully.
   */
  markDispatched(intentId: string, engineRunRef: EngineRunRef): Promise<void>;

  /**
   * Transition intent to RESOLVED. Called after bootstrapRunTx() succeeds
   * or after successful compensation. Terminal status.
   */
  markResolved(intentId: string): Promise<void>;

  /**
   * Transition a PENDING intent to EXPIRED. Called by reconciliation for
   * intents where adapter.startRun() was never called (or response never recorded).
   */
  markExpired(intentId: string): Promise<void>;

  /**
   * Find orphaned intents: PENDING or DISPATCHED beyond the threshold age.
   * Returns intents ordered by createdAt ASC (oldest first).
   */
  listOrphaned(thresholdMs: number, nowMs: number, limit?: number): Promise<StartRunIntent[]>;

  /**
   * Look up intent by intentId.
   */
  getIntent(intentId: string): Promise<StartRunIntent | null>;
}
