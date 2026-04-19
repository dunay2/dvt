/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSnapshotQueueAdapter.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Snapshot staleness queries and repair queue operations stay together as one maintenance slice
 * @consequence Snapshot recovery responsibilities no longer inflate the delivery facade file
 * @version 1.0.0
 * @date 2026-04-19
 */
import { PostgresRunStateStoreAdapter } from './PostgresRunStateStoreAdapter.js';
import type { IRunSnapshotStalenessQuery } from './types.js';

export class PostgresSnapshotQueueAdapter
  extends PostgresRunStateStoreAdapter
  implements IRunSnapshotStalenessQuery
{
  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    this.ready();
    return this.listStaleSnapshotRunsInternal(batchSize);
  }

  async isSnapshotStale(tenantId: string, runId: string): Promise<boolean> {
    this.ready();
    return this.isSnapshotStaleInternal(tenantId, runId);
  }

  async claimSnapshotWork(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string; claimToken: string }>> {
    this.ready();
    return this.claimSnapshotWorkInternal(batchSize);
  }

  async completeSnapshotWork(tenantId: string, runId: string, claimToken: string): Promise<void> {
    this.ready();
    await this.completeSnapshotWorkInternal(tenantId, runId, claimToken);
  }

  async failSnapshotWork(
    tenantId: string,
    runId: string,
    retryDelayMs: number,
    errorMessage: string,
    claimToken: string
  ): Promise<void> {
    this.ready();
    await this.failSnapshotWorkInternal(tenantId, runId, retryDelayMs, errorMessage, claimToken);
  }
}
