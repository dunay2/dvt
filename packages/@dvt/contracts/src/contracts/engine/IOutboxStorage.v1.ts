import type { EventEnvelope } from '../../engine/IRunStateStore.v1.js';

export type { EventEnvelope } from '../../engine/IRunStateStore.v1.js';

export interface OutboxRecord {
  id: string;
  createdAt: string;
  idempotencyKey: string;
  payload: EventEnvelope;
  attempts: number;
  lastError?: string;
  nextAttemptAt?: string;
}

export interface DeadLetterRecord {
  id: string;
  originalId: string;
  runId: string;
  payload: EventEnvelope;
  lastError: string;
  deadLetteredAt: string;
}
