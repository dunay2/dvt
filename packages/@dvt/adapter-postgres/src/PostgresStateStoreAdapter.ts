/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Delivery-facing port delegation remains the stable aggregate entrypoint for PostgreSQL state storage
 * @consequence Consumers keep one adapter type while the facade is split into smaller responsibility files
 * @version 1.0.0
 * @date 2026-04-19
 */
import type { ILineageOutboxStore } from '@dvt/traceability-service';

import { PostgresSnapshotQueueAdapter } from './PostgresSnapshotQueueAdapter.js';
import type {
  DeadLetterRecord,
  EventEnvelope,
  IOutboxStorage,
  OutboxRecord,
  RunId,
} from './types.js';

export class PostgresStateStoreAdapter
  extends PostgresSnapshotQueueAdapter
  implements IOutboxStorage
{
  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    this.ready();
    await this.enqueueTxInternal(runId, events);
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    this.ready();
    return this.listPendingInternal(limit);
  }

  async listPendingForClaim(
    limit: number,
    selection?: { shardIds?: readonly number[] }
  ): Promise<OutboxRecord[]> {
    this.ready();
    return this.listPendingForClaimInternal(limit, selection);
  }

  async markDelivered(ids: string[]): Promise<void> {
    this.ready();
    return this.markDeliveredInternal(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    this.ready();
    return this.markFailedInternal(id, error);
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    this.ready();
    return this.hasPendingRetriesInternal(selection);
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    this.ready();
    return this.listDeadLetterInternal(limit, tenantId);
  }

  getLineageOutboxStore(): ILineageOutboxStore {
    this.ready();
    return this.getLineageOutboxStoreInternal();
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    this.ready();
    return this.replayDeadLettersInternal(options);
  }
}
