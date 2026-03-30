import { describe, expect, it } from 'vitest';

import { PostgresSnapshotStalenessQuery } from '../src/PostgresSnapshotStalenessQuery.js';
const TEST_SCHEMA = 'dvt';
const TEST_RUN_ID = 'run-1';
const TEST_TENANT_ID = 'tenant-a';
const INVALID_STALE_BATCH_SIZE_MESSAGE = 'INVALID_STALE_SNAPSHOT_BATCH_SIZE';
const MAX_STALE_BATCH_SIZE = 1000;
const LARGE_BATCH_SIZE = 10_000;
const ZERO_BATCH_SIZE = 0;

interface RecordedQuery {
  sql: string;
  params?: readonly unknown[];
}

class RecordingClient {
  readonly queries: RecordedQuery[] = [];
  private readonly rowsByQuery: unknown[][] = [];

  enqueueRows(rows: unknown[]): void {
    this.rowsByQuery.push(rows);
  }

  async query<T = unknown>(
    sql: string,
    params?: readonly unknown[]
  ): Promise<{ rows: T[]; rowCount?: number | null }> {
    this.queries.push({ sql, params });
    const rows = this.rowsByQuery.shift() ?? [];
    return { rows: rows as T[] };
  }
}

function withRecordingClient(client: RecordingClient) {
  return async <T>(fn: (pgClient: RecordingClient) => Promise<T>): Promise<T> => fn(client);
}

describe('PostgresSnapshotStalenessQuery', () => {
  it('rejects invalid batch size values', async () => {
    const client = new RecordingClient();
    const query = new PostgresSnapshotStalenessQuery(
      TEST_SCHEMA,
      withRecordingClient(client) as never
    );

    await expect(query.listStaleSnapshotRuns(Number.NaN)).rejects.toThrow(
      INVALID_STALE_BATCH_SIZE_MESSAGE
    );
    await expect(query.listStaleSnapshotRuns(-1)).rejects.toThrow(INVALID_STALE_BATCH_SIZE_MESSAGE);
    await expect(query.listStaleSnapshotRuns(1.5)).rejects.toThrow(
      INVALID_STALE_BATCH_SIZE_MESSAGE
    );
    expect(client.queries).toHaveLength(0);
  });

  it('returns empty result without querying storage when batchSize is zero', async () => {
    const client = new RecordingClient();
    const query = new PostgresSnapshotStalenessQuery(
      TEST_SCHEMA,
      withRecordingClient(client) as never
    );

    const rows = await query.listStaleSnapshotRuns(ZERO_BATCH_SIZE);

    expect(rows).toEqual([]);
    expect(client.queries).toHaveLength(0);
  });

  it('uses tenant-scoped lateral max-run-seq lookup and caps batch size', async () => {
    const client = new RecordingClient();
    client.enqueueRows([{ run_id: TEST_RUN_ID, tenant_id: TEST_TENANT_ID }]);
    const query = new PostgresSnapshotStalenessQuery(
      TEST_SCHEMA,
      withRecordingClient(client) as never
    );

    const rows = await query.listStaleSnapshotRuns(LARGE_BATCH_SIZE);

    expect(rows).toEqual([{ runId: TEST_RUN_ID, tenantId: TEST_TENANT_ID }]);
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.sql).toContain('LEFT JOIN LATERAL (');
    expect(client.queries[0]?.sql).toContain('WHERE e.run_id = m.run_id');
    expect(client.queries[0]?.sql).toContain('AND e.tenant_id = m.tenant_id');
    expect(client.queries[0]?.sql).toContain('ORDER BY e.run_seq DESC');
    expect(client.queries[0]?.params).toEqual([MAX_STALE_BATCH_SIZE]);
  });

  it('checks staleness for a specific run with tenant scope', async () => {
    const client = new RecordingClient();
    client.enqueueRows([{ is_stale: true }]);
    const query = new PostgresSnapshotStalenessQuery(
      TEST_SCHEMA,
      withRecordingClient(client) as never
    );

    const stale = await query.isSnapshotStale(TEST_TENANT_ID, TEST_RUN_ID);

    expect(stale).toBe(true);
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.sql).toContain('SELECT EXISTS (');
    expect(client.queries[0]?.sql).toContain('WHERE m.tenant_id = $1');
    expect(client.queries[0]?.sql).toContain('AND m.run_id = $2');
    expect(client.queries[0]?.params).toEqual([TEST_TENANT_ID, TEST_RUN_ID]);
  });
});
