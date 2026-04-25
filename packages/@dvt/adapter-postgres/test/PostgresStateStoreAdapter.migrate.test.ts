import { describe, expect, it, vi } from 'vitest';

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

  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: { exists: boolean }[]; rowCount: number }> {
    this.queries.push({ sql, params });
    // Return exists: false so all migration steps are applied (not skipped)
    return { rows: [{ exists: false }], rowCount: 0 };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

class PartiallyAppliedMigrationClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  public releaseCalls = 0;

  constructor(private readonly appliedVersions: Set<string>) {}

  async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: { exists: boolean }[]; rowCount: number }> {
    this.queries.push({ sql, params });
    if (
      sql.includes('SELECT EXISTS') &&
      Array.isArray(params) &&
      params.length >= 2 &&
      typeof params[1] === 'string'
    ) {
      return { rows: [{ exists: this.appliedVersions.has(params[1]) }], rowCount: 1 };
    }
    return { rows: [{ exists: false }], rowCount: 0 };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

describe('PostgresStateStoreAdapter migration state', () => {
  it('fails fast when connection string sources are missing and no pool is provided', () => {
    const previousPgUrl = process.env.DVT_PG_URL;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DVT_PG_URL;
    delete process.env.DATABASE_URL;

    try {
      expect(() => new PostgresStateStoreAdapter({ schema: 'dvt' })).toThrow(
        /POSTGRES_CONNECTION_STRING_REQUIRED/
      );
    } finally {
      if (typeof previousPgUrl === 'undefined') {
        delete process.env.DVT_PG_URL;
      } else {
        process.env.DVT_PG_URL = previousPgUrl;
      }
      if (typeof previousDatabaseUrl === 'undefined') {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
    }
  });

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

  it('rejects schema rollback while tracked clients are still active', async () => {
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          throw new Error('connect should not be called when active clients exist');
        },
      } as never,
      assumeSchemaReady: true,
    });

    (
      adapter as unknown as {
        clientSession: {
          activeClients: Set<unknown>;
        };
      }
    ).clientSession.activeClients.add({ release() {} });

    await expect(adapter.rollbackSchemaTo('core_009_core_indexes')).rejects.toThrow(
      /SCHEMA_ROLLBACK_ACTIVE_CLIENTS/
    );
  });

  it('holds maintenance gate during rollback to prevent new client acquisition race', async () => {
    const pool = {
      connect: vi.fn(async () => {
        throw new Error('connect should not run while maintenance gate is active');
      }),
    };
    const adapter = new PostgresStateStoreAdapter({
      pool: pool as never,
      assumeSchemaReady: true,
    });
    const rollbackPlan = {
      component: 'core',
      schema: 'dvt',
      currentVersion: 'core_009_core_indexes',
      targetVersion: 'core_008_compat_cleanup',
      steps: [
        {
          version: 'core_009_core_indexes',
          description: 'Create all standard operational indexes',
          rollbackDescription:
            'Drop the standard operational indexes introduced by the core index step',
        },
      ],
    };

    (
      adapter as unknown as {
        schemaManager: {
          rollbackTo: (targetVersion: string | null) => Promise<unknown>;
        };
      }
    ).schemaManager.rollbackTo = vi.fn(async (_targetVersion: string | null) => {
      await expect(adapter.listPending(1)).rejects.toThrow(/SESSION_MAINTENANCE_MODE_ACTIVE/);
      return rollbackPlan;
    });

    await expect(adapter.rollbackSchemaTo('core_008_compat_cleanup')).resolves.toEqual(
      rollbackPlan
    );
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('applies SET LOCAL statement_timeout inside each step transaction when configured', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      schema: 'DvtOps',
      statementTimeoutMs: 4321,
    });

    await adapter.migrate();

    const sqls = client.queries.map((q) => q.sql);

    // Timeout must appear in the queries
    expect(sqls).toContain('SET LOCAL statement_timeout = $1');

    // It must follow a BEGIN (inside a step transaction, not outside)
    const timeoutIdx = client.queries.findIndex(
      (q) => q.sql === 'SET LOCAL statement_timeout = $1'
    );
    expect(client.queries[timeoutIdx - 1]?.sql).toBe('BEGIN');

    // Correct parameter value
    expect(client.queries[timeoutIdx]?.params).toEqual([4321]);
  });

  it('creates the schema_migrations tracking table', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');
    expect(executedSql).toContain('schema_migrations');
    expect(executedSql).toContain('component');
    expect(executedSql).toContain('applied_at');
  });

  it('uses an advisory lock to serialize concurrent migrations', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const sqls = client.queries.map((q) => q.sql);
    const lockSql = sqls.find((s) => s.includes('pg_advisory_lock'));
    const unlockSql = sqls.find((s) => s.includes('pg_advisory_unlock'));

    expect(lockSql).toBeDefined();
    expect(unlockSql).toBeDefined();
    expect(lockSql).toContain('left(md5($1), 16)');
    expect(unlockSql).toContain('left(md5($1), 16)');
  });

  it('records each step in schema_migrations with component and version', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const insertQueries = client.queries.filter(
      (q) => q.sql.includes('INSERT INTO') && q.sql.includes('schema_migrations')
    );
    // One INSERT per named migration step (17 steps)
    expect(insertQueries.length).toBe(17);

    const versions = insertQueries.map((q) => (q.params as string[])[1]);
    expect(versions).toContain('core_001_initial_tables');
    expect(versions).toContain('core_006_archive_lease_restore_tables');
    expect(versions).toContain('core_010_purge_indexes');
    expect(versions).toContain('core_011_retry_lineage_columns');
    expect(versions).toContain('core_012_lineage_outbox_retry_schedule');
    expect(versions).toContain('core_013_lineage_outbox_claim_timeout');
    expect(versions).toContain('core_014_lineage_tenant_scope_hardening');
    expect(versions).toContain('core_015_run_event_heads');
    expect(versions).toContain('core_016_snapshot_work_queue');
    expect(versions).toContain('core_017_tenant_rls_baseline');
  });

  it('creates the production tenant RLS baseline for tenant-owned online tables', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');

    expect(executedSql).toContain(
      'ALTER TABLE "DvtOps".run_snapshots ADD COLUMN IF NOT EXISTS tenant_id TEXT'
    );
    expect(executedSql).toContain(
      'ALTER TABLE "DvtOps".outbox ADD COLUMN IF NOT EXISTS tenant_id TEXT'
    );
    expect(executedSql).toContain(
      'ALTER TABLE "DvtOps".outbox_dead_letter ADD COLUMN IF NOT EXISTS tenant_id TEXT'
    );
    expect(executedSql).toContain('ALTER TABLE "DvtOps".run_metadata ENABLE ROW LEVEL SECURITY');
    expect(executedSql).toContain(
      'ALTER TABLE "DvtOps".snapshot_work_queue ENABLE ROW LEVEL SECURITY'
    );
    expect(executedSql).toContain('CREATE POLICY dvt_tenant_isolation');
    expect(executedSql).toContain("current_setting('dvt.access_mode', true) = 'service'");
    expect(executedSql).toContain("tenant_id = current_setting('dvt.tenant_id', true)");
  });

  it('rejects unresolved tenant backfills instead of synthesizing tenant ids', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');
    expect(executedSql).not.toContain('__unknown_tenant__');
    expect(executedSql).toContain('LINEAGE_OUTBOX_TENANT_BACKFILL_REQUIRED');
    expect(executedSql).toContain('LINEAGE_DEAD_LETTER_TENANT_BACKFILL_REQUIRED');
  });

  it('creates the archive catalog tables and indexes required for G5-PR1', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');

    expect(executedSql).toContain('run_event_archive_units');
    expect(executedSql).toContain('run_event_archive_batches');
    expect(executedSql).toContain('run_event_archive_units_state_day_idx');
    expect(executedSql).toContain('run_event_archive_batches_unit_status_idx');
    expect(executedSql).toContain('archive_unit_key TEXT');
    expect(executedSql).toContain('event_checksum_sha256 TEXT');
    expect(executedSql).toContain('archived_at TIMESTAMPTZ');
    expect(executedSql).toContain('run_snapshots_archive_unit_key_idx');
  });

  it('creates the archive lease and restore log tables required for G5-PR2', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');

    expect(executedSql).toContain('run_event_archive_leases');
    expect(executedSql).toContain('run_event_archive_restore_log');
    expect(executedSql).toContain('archive_restore_log_unit_key_idx');
  });

  it('adds lineage retry/claim columns before creating the lineage pending index shape', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const sqls = client.queries.map((q) => q.sql);
    const addNextAttemptAtIdx = sqls.findIndex((sql) =>
      sql.includes('ALTER TABLE "DvtOps".lineage_outbox ADD COLUMN IF NOT EXISTS next_attempt_at')
    );
    const addClaimedAtIdx = sqls.findIndex((sql) =>
      sql.includes('ALTER TABLE "DvtOps".lineage_outbox ADD COLUMN IF NOT EXISTS claimed_at')
    );
    const lineagePendingIdx = sqls.findIndex(
      (sql) =>
        sql.includes('CREATE INDEX IF NOT EXISTS lineage_outbox_pending_idx') &&
        sql.includes('(next_attempt_at ASC NULLS FIRST, created_at ASC, claimed_at ASC)')
    );

    expect(addNextAttemptAtIdx).toBeGreaterThan(-1);
    expect(addClaimedAtIdx).toBeGreaterThan(-1);
    expect(lineagePendingIdx).toBeGreaterThan(addNextAttemptAtIdx);
    expect(lineagePendingIdx).toBeGreaterThan(addClaimedAtIdx);
  });

  it('handles partial-applied chains by adding lineage retry/claim columns before index recreation', async () => {
    const appliedVersions = new Set<string>([
      'core_001_initial_tables',
      'core_002_run_snapshots_table',
      'core_003_outbox_dead_letter_table',
      'core_004_lineage_tables',
      'core_005_archive_catalog_tables',
      'core_006_archive_lease_restore_tables',
      'core_007_compat_columns',
      'core_008_compat_cleanup',
    ]);
    const client = new PartiallyAppliedMigrationClient(appliedVersions);
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');
    expect(executedSql).toContain(
      'ALTER TABLE "DvtOps".lineage_outbox ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ'
    );
    expect(executedSql).toContain(
      'ALTER TABLE "DvtOps".lineage_outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ'
    );
    expect(executedSql).toContain('CREATE INDEX IF NOT EXISTS lineage_outbox_pending_idx');
  });

  it('creates the delivery buffer purge indexes required for G5-PR3', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');

    expect(executedSql).toContain('outbox_delivered_at_idx');
    expect(executedSql).toContain('outbox_dead_letter_dead_lettered_at_idx');
    expect(executedSql).toContain('lineage_dead_letter_dead_lettered_at_idx');
  });

  it('creates and backfills run_event_heads for S19-F1', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');

    expect(executedSql).toContain('run_event_heads');
    expect(executedSql).toContain('latest_run_seq INTEGER NOT NULL');
    expect(executedSql).toContain('run_event_heads_tenant_updated_idx');
    expect(executedSql).toContain('INSERT INTO "DvtOps".run_event_heads');
    expect(executedSql).toContain('GROUP BY e.run_id, e.tenant_id');
  });

  it('creates and backfills snapshot_work_queue for S19-F1 phase 2', async () => {
    const client = new RecordingMigrationClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: { connect: async () => client } as never,
      schema: 'DvtOps',
    });

    await adapter.migrate();

    const executedSql = client.queries.map((q) => q.sql).join('\n');

    expect(executedSql).toContain('snapshot_work_queue');
    expect(executedSql).toContain('latest_run_seq INTEGER NOT NULL');
    expect(executedSql).toContain('claimed_at TIMESTAMPTZ');
    expect(executedSql).toContain('next_attempt_at TIMESTAMPTZ');
    expect(executedSql).toContain('attempts INTEGER NOT NULL DEFAULT 0');
    expect(executedSql).toContain('snapshot_work_queue_enqueued_idx');
    expect(executedSql).toContain('INSERT INTO "DvtOps".snapshot_work_queue');
    expect(executedSql).toContain('h.latest_run_seq > COALESCE(s.last_run_seq, 0)');
  });
});
