/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuery.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Isolate stale snapshot SQL query from the facade adapter
 * @consequence Snapshot catch-up selection stays replaceable and independently testable
 * @version 1.0.0
 * @date 2026-03-28
 */
import type { PoolClient } from 'pg';

import { listStaleSnapshotRunsSql } from './PostgresSnapshotStalenessQuerySql.js';
import type { IRunSnapshotStalenessQuery } from './types.js';

type WithClient = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;

export class PostgresSnapshotStalenessQuery implements IRunSnapshotStalenessQuery {
  constructor(
    private readonly schema: string,
    private readonly withClient: WithClient
  ) {}

  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    return this.withClient(async (client) => {
      const result = await client.query<{ run_id: string; tenant_id: string }>(
        listStaleSnapshotRunsSql(this.schema),
        [batchSize]
      );
      return result.rows.map((row) => ({ runId: row.run_id, tenantId: row.tenant_id }));
    });
  }
}
