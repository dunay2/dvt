import { describe, expect, it } from 'vitest';

import { PostgresStartRunIntentStore } from '../src/index.js';

const NOW = '2026-04-25T00:00:00.000Z';

interface RecordedQuery {
  readonly text: string;
  readonly values: unknown[] | undefined;
}

class RecordingClient {
  public readonly queries: RecordedQuery[] = [];
  public releaseCalls = 0;

  public async query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }> {
    this.queries.push({ text, values });
    if (isSessionControlSql(text)) {
      return { rows: [] };
    }
    if (text.includes('WITH inserted AS')) {
      return { rows: [buildIntentRow()] as T[] };
    }
    if (text.includes('WITH updated AS')) {
      return { rows: [{ outcome: 'UPDATED', current_status: 'PENDING' }] as T[] };
    }
    if (text.includes('FROM "dvt".start_run_intents')) {
      return { rows: [buildIntentRow()] as T[] };
    }
    return { rows: [] };
  }

  public release(): void {
    this.releaseCalls += 1;
  }
}

class RecordingPool {
  public readonly client = new RecordingClient();

  public get queries(): readonly RecordedQuery[] {
    return this.client.queries;
  }

  public async connect(): Promise<RecordingClient> {
    return this.client;
  }

  public async query(): Promise<never> {
    throw new Error('DIRECT_POOL_QUERY_FORBIDDEN');
  }

  public async end(): Promise<void> {
    return undefined;
  }
}

describe('PostgresStartRunIntentStore contextual access', () => {
  it('runs tenant-owned intent operations through service-context sessions', async () => {
    const pool = new RecordingPool();
    const store = new PostgresStartRunIntentStore({
      pool: pool as never,
      schema: 'dvt',
      now: () => NOW,
      schemaManager: {
        migrate: async () => undefined,
      } as never,
    });

    await store.migrate();
    await store.createIntent({
      intentId: 'intent-1',
      tenantId: 'tenant-1',
      runId: 'run-1',
      provider: 'temporal',
      createdAt: NOW,
    });
    await store.markResolved('intent-1');
    await store.listOrphaned(60_000, Date.parse(NOW), 10);
    await store.getIntent('intent-1');

    const sqls = pool.queries.map((query) => query.text);
    expect(sqls.filter((sql) => sql === 'BEGIN')).toHaveLength(4);
    expect(sqls.filter((sql) => sql === 'COMMIT')).toHaveLength(4);
    expect(
      sqls.filter((sql) => sql.includes("set_config('dvt.access_mode', 'service', true)"))
    ).toHaveLength(4);
    expect(pool.client.releaseCalls).toBe(4);
  });
});

function isSessionControlSql(sql: string): boolean {
  return (
    sql === 'BEGIN' ||
    sql === 'COMMIT' ||
    sql === 'ROLLBACK' ||
    sql.includes("set_config('dvt.access_mode'")
  );
}

function buildIntentRow(): Record<string, unknown> {
  return {
    intent_id: 'intent-1',
    tenant_id: 'tenant-1',
    run_id: 'run-1',
    provider: 'temporal',
    status: 'PENDING',
    engine_run_ref: null,
    created_at: NOW,
    updated_at: NOW,
  };
}
