import { describe, expect, it } from 'vitest';

import { PostgresRunArchiveStore } from '../src/PostgresRunArchiveStore.js';

interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

class ScriptedClient {
  readonly queries: Array<{ sql: string; params?: readonly unknown[] }> = [];

  constructor(private readonly rows: readonly unknown[]) {}

  async query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<QueryResult<T>> {
    this.queries.push({ sql, params });
    if (sql.includes('FROM "dvt".run_events e')) {
      return { rows: this.rows as T[], rowCount: this.rows.length };
    }
    return { rows: [] as T[], rowCount: 0 };
  }
}

describe('PostgresRunArchiveStore tenant retention policy', () => {
  it('does not export a partial tenant subset from a shared archive unit', async () => {
    const client = new ScriptedClient([
      makeEligibleRunRow({ tenant_id: 'free-tier' }),
      makeEligibleRunRow({ tenant_id: 'enterprise' }),
    ]);
    const store = makeStore(client);

    const units = await store.listEligibleArchiveUnits(
      {
        hotRetentionDays: 7,
        archiveBucketCount: 1,
        pinTerminalSnapshots: true,
        tenantHotRetentionDays: [{ tenantId: 'enterprise', hotRetentionDays: 30 }],
      },
      '2026-05-22T00:00:00.000Z'
    );

    expect(units).toEqual([]);
    expect(client.queries.some((query) => query.sql.includes('INSERT INTO'))).toBe(false);
  });

  it('marks the shared archive unit eligible after all tenants satisfy their own policy', async () => {
    const client = new ScriptedClient([
      makeEligibleRunRow({ tenant_id: 'free-tier' }),
      makeEligibleRunRow({ tenant_id: 'enterprise' }),
    ]);
    const store = makeStore(client);

    const units = await store.listEligibleArchiveUnits(
      {
        hotRetentionDays: 7,
        archiveBucketCount: 1,
        pinTerminalSnapshots: true,
        tenantHotRetentionDays: [{ tenantId: 'enterprise', hotRetentionDays: 9 }],
      },
      '2026-05-22T00:00:00.000Z'
    );

    expect(units).toMatchObject([
      {
        archiveUnitKey: 'tb00_2026_05_12',
        tenantBucket: 'tb00',
        tenantIds: ['enterprise', 'free-tier'],
        rowCount: 2,
        state: 'ELIGIBLE',
      },
    ]);
    expect(client.queries.some((query) => query.sql.includes('INSERT INTO'))).toBe(true);
  });
});

function makeStore(client: ScriptedClient): PostgresRunArchiveStore {
  const withTransaction = async <T>(fn: (client: ScriptedClient) => Promise<T>): Promise<T> =>
    fn(client);
  return new PostgresRunArchiveStore('dvt', withTransaction as never, withTransaction as never, {
    async pinTerminalSnapshot() {
      throw new Error('not used');
    },
    async getPinnedTerminalSnapshot() {
      throw new Error('not used');
    },
  });
}

function makeEligibleRunRow(overrides: { tenant_id: string }): Record<string, unknown> {
  return {
    tenant_id: overrides.tenant_id,
    persisted_at_day: '2026-05-12',
    run_id: `run-${overrides.tenant_id}`,
    row_count: 1,
    min_run_seq: 1,
    max_run_seq: 1,
    max_persisted_at: '2026-05-12T00:00:00.000Z',
    snapshot_status: 'COMPLETED',
  };
}
