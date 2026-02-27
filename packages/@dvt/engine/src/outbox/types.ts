/**
 * @file packages/@dvt/engine/src/outbox/types.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Decision — The outbox defines explicit contracts for recording, dead-lettering and publishing to guarantee robust delivery
 * @consequence Storage/bus implementations share a stable delivery and retry model
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { RunEventPersisted } from '../contracts/runEvents.js';

export interface OutboxRecord {
  id: string; // unique record id
  createdAt: string;
  idempotencyKey: string;
  payload: RunEventPersisted;
  attempts: number;
  lastError?: string;
  /**
   * Optional retry gate. When present, workers SHOULD NOT redeliver this record
   * before this timestamp.
   */
  nextAttemptAt?: string;
}

export interface DeadLetterRecord {
  id: string;
  originalId: string;
  runId: string;
  payload: RunEventPersisted;
  lastError: string;
  deadLetteredAt: string;
}

/**
 * Maximum delivery attempts before an outbox record is dead-lettered.
 */
export const MAX_OUTBOX_ATTEMPTS = 10;

export interface IOutboxStorage {
  enqueueTx(runId: string, events: RunEventPersisted[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  /**
   * Optional DLQ listing capability for operational tooling.
   */
  listDeadLetter?(limit: number): Promise<DeadLetterRecord[]>;
  /**
   * Optional manual replay capability from DLQ back into pending outbox.
   * Returns number of records moved.
   */
  replayDeadLetters?(options?: { limit?: number; runId?: string; ids?: string[] }): Promise<number>;
}

export interface IEventBus {
  publish(events: RunEventPersisted[]): Promise<void>;
}
