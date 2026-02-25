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
  id: string;
  createdAt: string;
  idempotencyKey: string;
  payload: RunEventPersisted;
  attempts: number;
  lastError?: string;
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
export declare const MAX_OUTBOX_ATTEMPTS = 10;
export interface IOutboxStorage {
  enqueueTx(runId: string, events: RunEventPersisted[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}
export interface IEventBus {
  publish(events: RunEventPersisted[]): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map
