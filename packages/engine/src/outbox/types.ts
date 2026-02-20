import type { RunEventPersisted } from '../contracts/runEvents.js';

export interface OutboxRecord {
  id: string; // unique record id
  createdAt: string;
  idempotencyKey: string;
  payload: RunEventPersisted;
  attempts: number;
  lastError?: string;
}

export interface IOutboxStorage {
  enqueueTx(runId: string, events: RunEventPersisted[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface IEventBus {
  publish(events: RunEventPersisted[]): Promise<void>;
}
