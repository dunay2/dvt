import type { EventEnvelope } from '../contracts/runEvents.js';

export interface OutboxRecord {
  id: string; // unique record id
  createdAt: string;
  idempotencyKey: string;
  payload: EventEnvelope;
  attempts: number;
  lastError?: string;
}

export interface IOutboxStorage {
  enqueueTx(runId: string, events: EventEnvelope[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface IEventBus {
  publish(events: EventEnvelope[]): Promise<void>;
}
