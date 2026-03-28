/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Isolate stale snapshot SQL query from the facade adapter
 * @consequence Snapshot catch-up selection stays replaceable and independently testable
 * @version 1.0.0
 * @date 2026-03-28
 */
import type { PoolClient } from 'pg';

import { POSTGRES_ADAPTER_ERROR_CONSTANTS as E } from './PostgresAdapterConstants.js';
import { listStaleSnapshotRunsSql } from './PostgresSnapshotStalenessQuerySql.js';
import type { IRunSnapshotStalenessQuery } from './types.js';

type WithClient = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
const MAX_STALE_SNAPSHOT_BATCH_SIZE = 1000;
const MIN_STALE_SNAPSHOT_BATCH_SIZE = 0;

export class PostgresSnapshotStalenessQuery implements IRunSnapshotStalenessQuery {
  constructor(
    private readonly schema: string,
    private readonly withClient: WithClient
  ) {}

  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    const boundedBatchSize = normalizeStaleSnapshotBatchSize(batchSize);
    if (boundedBatchSize === 0) {
      return [];
    }

    return this.withClient(async (client) => {
      const result = await client.query<{ run_id: string; tenant_id: string }>(
        listStaleSnapshotRunsSql(this.schema),
        [boundedBatchSize]
      );
      return result.rows.map((row) => ({ runId: row.run_id, tenantId: row.tenant_id }));
    });
  }
}

function normalizeStaleSnapshotBatchSize(batchSize: number): number {
  if (
    !Number.isInteger(batchSize) ||
    !Number.isFinite(batchSize) ||
    batchSize < MIN_STALE_SNAPSHOT_BATCH_SIZE
  ) {
    throw new Error(`${E.invalidStaleSnapshotBatchSizeErrorCode}: ${batchSize}`);
  }
  return Math.min(batchSize, MAX_STALE_SNAPSHOT_BATCH_SIZE);
}
