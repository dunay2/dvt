/**
 * @file packages/@dvt/contracts/src/contracts/engine/IStartRunIntentStore.v1.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Canonical command/query contract for start-run intent durability
 * @consequence Engine and adapters share one contract and status vocabulary
 * @version 1.0.0
 * @date 2026-03-05
 */
import type { EngineRunRef } from '../../types/contracts.js';

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

/**
 * Commands mutate intent state.
 */
export interface IStartRunIntentCommandStore {
  createIntent(input: CreateIntentInput): Promise<StartRunIntent>;
  markDispatched(intentId: string, engineRunRef: EngineRunRef): Promise<void>;
  markResolved(intentId: string): Promise<void>;
  markExpired(intentId: string): Promise<void>;
}

/**
 * Queries read intent state without mutation.
 */
export interface IStartRunIntentQueryStore {
  listOrphaned(thresholdMs: number, nowMs: number, limit?: number): Promise<StartRunIntent[]>;
  getIntent(intentId: string): Promise<StartRunIntent | null>;
}

export interface IStartRunIntentStore
  extends IStartRunIntentCommandStore, IStartRunIntentQueryStore {}
