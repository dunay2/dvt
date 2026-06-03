import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { PostgresSnapshotStalenessQuery } from '../src/PostgresSnapshotStalenessQuery.js';
import { IS_SNAPSHOT_STALE_ALIAS } from '../src/PostgresSnapshotStalenessQuerySql.js';
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
    if (sql.includes("set_config('dvt.")) {
      return { rows: [] };
    }
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

  it('uses run_event_heads first, fallback guard, and caps batch size', async () => {
    const client = new RecordingClient();
    client.enqueueRows([{ run_id: TEST_RUN_ID, tenant_id: TEST_TENANT_ID }]);
    const query = new PostgresSnapshotStalenessQuery(
      TEST_SCHEMA,
      withRecordingClient(client) as never
    );

    const rows = await query.listStaleSnapshotRuns(LARGE_BATCH_SIZE);

    expect(rows).toEqual([{ runId: TEST_RUN_ID, tenantId: TEST_TENANT_ID }]);
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.sql).toContain('LEFT JOIN "dvt".run_event_heads h');
    expect(client.queries[0]?.sql).toContain('h.run_id = m.run_id');
    expect(client.queries[0]?.sql).toContain('h.tenant_id = m.tenant_id');
    expect(client.queries[0]?.sql).toContain('h.run_id IS NULL');
    expect(client.queries[0]?.sql).toContain('AND EXISTS (');
    expect(client.queries[0]?.sql).toContain('e.run_seq > COALESCE(s.last_run_seq, 0)');
    expect(client.queries[0]?.sql).toContain(
      `COALESCE(s.snapshot->>'schemaVersion', '') <> '${CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION}'`
    );
    expect(client.queries[0]?.params).toEqual([MAX_STALE_BATCH_SIZE]);
  });

  it('checks staleness for a single tenant-scoped run', async () => {
    const client = new RecordingClient();
    client.enqueueRows([{ [IS_SNAPSHOT_STALE_ALIAS]: true }]);
    const query = new PostgresSnapshotStalenessQuery(
      TEST_SCHEMA,
      withRecordingClient(client) as never
    );

    const isStale = await query.isSnapshotStale(TEST_TENANT_ID, TEST_RUN_ID);

    expect(isStale).toBe(true);
    expect(client.queries).toHaveLength(1);
    expect(client.queries[0]?.sql).toContain(`AS ${IS_SNAPSHOT_STALE_ALIAS}`);
    expect(client.queries[0]?.sql).toContain('SELECT EXISTS (');
    expect(client.queries[0]?.sql).toContain('LEFT JOIN LATERAL (');
    expect(client.queries[0]?.sql).toContain('m.tenant_id = $1');
    expect(client.queries[0]?.sql).toContain('m.run_id = $2');
    expect(client.queries[0]?.sql).toContain('s.run_id IS NULL AND le.run_seq IS NOT NULL');
    expect(client.queries[0]?.sql).toContain(
      `COALESCE(s.snapshot->>'schemaVersion', '') <> '${CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION}'`
    );
    expect(client.queries[0]?.params).toEqual([TEST_TENANT_ID, TEST_RUN_ID]);
  });
});
