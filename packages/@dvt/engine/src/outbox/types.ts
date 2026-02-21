import type { RunEventPersisted } from '../contracts/runEvents.js';

export interface OutboxRecord {
  id: string; // unique record id
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
export const MAX_OUTBOX_ATTEMPTS = 10;

export interface IOutboxStorage {
  enqueueTx(runId: string, events: RunEventPersisted[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface IEventBus {
  publish(events: RunEventPersisted[]): Promise<void>;
}
