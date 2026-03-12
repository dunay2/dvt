import type { EventEnvelope } from './IRunStateStore.v1';

export type { EventEnvelope } from './IRunStateStore.v1';

export interface OutboxClaimSelection {
  shardIds?: readonly number[];
}

export interface IOutboxStorage {
  enqueueTx(runId: string, events: EventEnvelope[]): Promise<void>;
  listPending(limit: number): Promise<
    Array<{
      id: string;
      createdAt: string;
      idempotencyKey: string;
      payload: EventEnvelope;
      attempts: number;
      lastError?: string;
    }>
  >;
  listPendingForClaim?(
    limit: number,
    selection?: OutboxClaimSelection
  ): Promise<
    Array<{
      id: string;
      createdAt: string;
      idempotencyKey: string;
      payload: EventEnvelope;
      attempts: number;
      lastError?: string;
    }>
  >;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  hasPendingRetries?(): Promise<boolean>;
}
