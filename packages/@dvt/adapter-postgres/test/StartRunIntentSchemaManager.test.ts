import { describe, expect, it } from 'vitest';

import { StartRunIntentSchemaManager } from '../src/StartRunIntentSchemaManager.js';

class RecordingMigrationClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  public releaseCalls = 0;

  constructor(private readonly existing = false) {}

  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    this.queries.push({ sql, params });
    if (sql.includes('to_regclass') && this.existing) {
      return { rows: [{ relation: 'DvtOps.start_run_intents' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

describe('StartRunIntentSchemaManager migration locking', () => {
  it('uses 64-bit md5 advisory lock keys for lock and unlock', async () => {
    const client = new RecordingMigrationClient();
    const manager = new StartRunIntentSchemaManager({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
    });

    await manager.migrate();

    const sqls = client.queries.map((query) => query.sql);
    const lockSql = sqls.find((sql) => sql.includes('pg_advisory_lock'));
    const unlockSql = sqls.find((sql) => sql.includes('pg_advisory_unlock'));

    expect(lockSql).toBeDefined();
    expect(unlockSql).toBeDefined();
    expect(lockSql).toContain('left(md5($1), 16)');
    expect(unlockSql).toContain('left(md5($1), 16)');
    expect(lockSql).not.toContain('hashtext');
    expect(unlockSql).not.toContain('hashtext');
    expect(client.releaseCalls).toBe(1);
  });

  it('applies forced RLS to the start-run intent log', async () => {
    const client = new RecordingMigrationClient();
    const manager = new StartRunIntentSchemaManager({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
    });

    await manager.migrate();

    const migrationSql = client.queries.map((query) => query.sql).join('\n');
    expect(migrationSql).toContain(
      'ALTER TABLE "DvtOps"."start_run_intents" ENABLE ROW LEVEL SECURITY'
    );
    expect(migrationSql).toContain(
      'ALTER TABLE "DvtOps"."start_run_intents" FORCE ROW LEVEL SECURITY'
    );
    expect(migrationSql).toContain('CREATE POLICY dvt_tenant_isolation');
    expect(migrationSql).toContain("current_setting('dvt.access_mode', true) = 'service'");
    expect(migrationSql).toContain("current_setting('dvt.service_access_owner', true)");
    expect(migrationSql).toContain("'start-run-intent-reconciler'");
    expect(migrationSql).toContain("tenant_id = current_setting('dvt.tenant_id', true)");
    expect(client.queries.flatMap((query) => query.params ?? [])).toContain(
      '20260930_owned_start_protocol'
    );
  });

  it('refuses an existing legacy registry without attempting DDL or row updates', async () => {
    const client = new RecordingMigrationClient(true);
    const manager = new StartRunIntentSchemaManager({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });
    await expect(manager.migrate()).rejects.toThrow('START_RUN_INTENT_SCHEMA_INCOMPATIBLE');
    expect(
      client.queries.some((query) =>
        /^(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(query.sql.trim())
      )
    ).toBe(false);
    expect(client.queries.at(-1)?.sql).toContain('pg_advisory_unlock');
    expect(client.releaseCalls).toBe(1);
  });

  it('records only the current initializer identity without legacy conversion', async () => {
    const client = new RecordingMigrationClient();
    const manager = new StartRunIntentSchemaManager({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
    });

    await manager.migrate();

    const descriptions = client.queries
      .filter(
        (query) => query.sql.includes('INSERT INTO') && query.sql.includes('schema_migrations')
      )
      .map((query) => query.params?.[2])
      .filter((value): value is string => typeof value === 'string');

    expect(descriptions).toEqual([
      'Exclusive start ownership protocol; initialize only, no legacy conversion',
    ]);
  });
});
