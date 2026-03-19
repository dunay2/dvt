import { describe, expect, it } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/PostgresStateStoreAdapter.js';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

class RecordingMigrationClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  public releaseCalls = 0;

  async query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> {
    this.queries.push({ sql, params });
    return { rows: [], rowCount: 0 };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

describe('PostgresStateStoreAdapter migration state', () => {
  it('rejects use before migrate() is called', async () => {
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          throw new Error('connect should not be reached before migrate');
        },
      } as never,
    });

    await expect(adapter.listPending(0)).rejects.toThrow(/MIGRATE_NOT_CALLED/);
  });

  it('treats assumeSchemaReady as ready without seeding a synthetic migrate promise', async () => {
    let connectCalls = 0;
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          connectCalls += 1;
          throw new Error('connect should not be called when limit is zero');
        },
      } as never,
      assumeSchemaReady: true,
    });

    await expect(adapter.listPending(0)).resolves.toEqual([]);
    expect(
      (adapter as unknown as { schemaManager: { migratePromise: Promise<void> | null } })
        .schemaManager.migratePromise
    ).toBeNull();
    expect(connectCalls).toBe(0);
  });

  it('reports MIGRATE_IN_PROGRESS until a pending migrate() settles', async () => {
    const connectDeferred = createDeferred<never>();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => connectDeferred.promise,
      } as never,
    });

    const migratePromise = adapter.migrate();

    await expect(adapter.listPending(0)).rejects.toThrow(/MIGRATE_IN_PROGRESS/);

    connectDeferred.reject(new Error('synthetic migrate failure'));

    await expect(migratePromise).rejects.toThrow(/synthetic migrate failure/);
    await expect(adapter.listPending(0)).rejects.toThrow(/MIGRATE_NOT_CALLED/);
  });

  it('applies SET LOCAL statement_timeout during migrate() when configured', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
      statementTimeoutMs: 4321,
    });

    await adapter.migrate();

    expect(client.queries[0]?.sql).toBe('BEGIN');
    expect(client.queries[1]).toEqual({
      sql: 'SET LOCAL statement_timeout = $1',
      params: [4321],
    });
    expect(client.queries.at(-1)?.sql).toBe('COMMIT');
    expect(client.releaseCalls).toBe(1);
  });

  it('creates the archive catalog tables and indexes required for Gap 5 P1', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((entry) => entry.sql).join('\n');

    expect(executedSql).toContain('run_event_archive_units');
    expect(executedSql).toContain('run_event_archive_batches');
    expect(executedSql).toContain('run_event_archive_units_state_day_idx');
    expect(executedSql).toContain('run_event_archive_batches_unit_status_idx');
  });
});
