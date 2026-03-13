import type { EventEnvelope } from './IRunStateStore.v1.js';

export type { EventEnvelope } from './IRunStateStore.v1.js';

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

export type OutboxFailureDisposition = 'retry' | 'dead_letter';

export interface OutboxClaimSelection {
  shardIds?: readonly number[];
}

export interface OutboxWorkerObserver {
  onBatchClaimed?(records: readonly OutboxRecord[]): void | Promise<void>;
  onRecordDelivered?(record: OutboxRecord): void | Promise<void>;
  onRecordFailed?(
    record: OutboxRecord,
    error: string,
    disposition: OutboxFailureDisposition
  ): void | Promise<void>;
}

export interface OutboxTickResult {
  claimedCount: number;
  deliveredCount: number;
  retriedCount: number;
  deadLetteredCount: number;
  oldestClaimedAgeMs: number | null;
  retryBacklogActive: boolean;
}

export const MAX_OUTBOX_ATTEMPTS = 10;

export interface IOutboxStorage {
  enqueueTx(runId: string, events: EventEnvelope[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  listPendingForClaim?(
    limit: number,
    selection?: OutboxClaimSelection
  ): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  hasPendingRetries?(selection?: OutboxClaimSelection): Promise<boolean>;
  listDeadLetter?(limit: number): Promise<DeadLetterRecord[]>;
  replayDeadLetters?(options?: { limit?: number; runId?: string; ids?: string[] }): Promise<number>;
}

export interface IEventBus {
  publish(events: EventEnvelope[]): Promise<void>;
}
