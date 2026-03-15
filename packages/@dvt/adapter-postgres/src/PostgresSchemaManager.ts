/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
 *
 * Owns all DDL lifecycle for the DVT Postgres schema:
 * - CREATE TABLE / CREATE INDEX migrations (idempotent)
 * - backward-compatibility ALTER TABLE / DROP INDEX patches
 * - tenant context session variable
 *
 * Separating DDL from data access allows the runtime role to have no DDL
 * privileges while a privileged migration step uses this class directly.
 */
import { Pool, type PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';

type MigrationState = 'not_called' | 'in_progress' | 'ready';

export class PostgresSchemaManager {
  private migrationState: MigrationState = 'not_called';
  private migratePromise: Promise<void> | null = null;

  constructor(
    private readonly pool: Pool,
    private readonly schema: string
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Runs all DDL migrations (CREATE TABLE IF NOT EXISTS, indexes, compat patches).
   *
   * Must be called — and awaited — once before the adapter is used.
   * Safe to call multiple times: subsequent calls are no-ops (idempotent).
   * If migration fails, the promise is cleared so callers can retry.
   */
  async migrate(): Promise<void> {
    if (this.migrationState === 'ready') return;

    this.migratePromise ??= this.runMigrations()
      .then(() => {
        this.migrationState = 'ready';
      })
      .catch((error: unknown) => {
        this.migratePromise = null;
        this.migrationState = 'not_called';
        throw error;
      });
    this.migrationState = 'in_progress';
    return this.migratePromise;
  }

  /**
   * Marks the schema as already ready, bypassing DDL execution.
   * Used when `assumeSchemaReady` is set in the adapter config.
   */
  markReady(): void {
    this.migrationState = 'ready';
  }

  /**
   * Throws if migrate() has not been called and completed successfully.
   * Call this at the top of every data-access method.
   */
  ready(): void {
    if (this.migrationState === 'not_called') {
      throw new Error('MIGRATE_NOT_CALLED: call await adapter.migrate() before using the adapter');
    }
    if (this.migrationState === 'in_progress') {
      throw new Error('MIGRATE_IN_PROGRESS: await adapter.migrate() before using the adapter');
    }
  }

  /**
   * Sets `dvt.tenant_id` as a transaction-local Postgres config parameter.
   *
   * Must be called at the start of a transaction (after BEGIN) when Row Level
   * Security is active. The setting resets automatically at transaction end —
   * it never leaks to subsequent transactions on the same connection.
   *
   * ```ts
   * const client = await pool.connect();
   * await client.query('BEGIN');
   * await PostgresSchemaManager.setTenantContext(client, tenantId);
   * // … tenant-scoped queries …
   * await client.query('COMMIT');
   * client.release();
   * ```
   */
  static async setTenantContext(client: PoolClient, tenantId: string): Promise<void> {
    await client.query(`SELECT set_config('dvt.tenant_id', $1, true)`, [tenantId]);
  }

  // ---------------------------------------------------------------------------
  // Migration runner
  // ---------------------------------------------------------------------------

  private async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.ensureSchemaObjects(client);
      await this.ensureCompatibilityColumns(client);
      await this.ensureCompatibilityCleanup(client);
      await this.ensureIndexes(client);
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Connection may already be torn down.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------------------------------------------------------------------
  // Schema objects (tables)
  // ---------------------------------------------------------------------------

  private async ensureSchemaObjects(client: PoolClient): Promise<void> {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);
    await this.ensureRunMetadataTable(client);
    await this.ensureRunEventsTable(client);
    await this.ensureOutboxTable(client);
    await this.ensureRunSnapshotsTable(client);
    await this.ensureOutboxDeadLetterTable(client);
  }

  private async ensureRunMetadataTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.run_metadata (
        run_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        plan_id TEXT,
        plan_version TEXT,
        provider TEXT NOT NULL,
        provider_workflow_id TEXT NOT NULL,
        provider_run_id TEXT NOT NULL,
        provider_namespace TEXT,
        provider_task_queue TEXT,
        provider_conductor_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  private async ensureRunEventsTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.run_events (
        run_id TEXT NOT NULL,
        run_seq INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        emitted_at TIMESTAMPTZ NOT NULL,
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        engine_attempt_id INTEGER NOT NULL,
        logical_attempt_id INTEGER NOT NULL,
        plan_id TEXT,
        plan_version TEXT,
        persisted_at TIMESTAMPTZ,
        step_id TEXT,
        idempotency_key TEXT NOT NULL,
        payload JSONB NOT NULL,
        PRIMARY KEY (run_id, run_seq),
        UNIQUE (run_id, idempotency_key)
      )
    `);
  }

  private async ensureOutboxTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.outbox (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        shard_id INTEGER NOT NULL DEFAULT 0,
        run_seq INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        idempotency_key TEXT NOT NULL,
        payload JSONB NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        claimed_at TIMESTAMPTZ,
        next_attempt_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ
      )
    `);
  }

  private async ensureRunSnapshotsTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.run_snapshots (
        run_id TEXT PRIMARY KEY,
        snapshot JSONB NOT NULL,
        snapshot_status TEXT GENERATED ALWAYS AS (snapshot->>'status') STORED,
        last_run_seq INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
  }

  private async ensureOutboxDeadLetterTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.outbox_dead_letter (
        id TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        run_id TEXT NOT NULL,
        shard_id INTEGER NOT NULL DEFAULT 0,
        payload JSONB NOT NULL,
        last_error TEXT NOT NULL,
        dead_lettered_at TIMESTAMPTZ NOT NULL
      )
    `);
  }

  // ---------------------------------------------------------------------------
  // Backward-compatibility patches
  // ---------------------------------------------------------------------------

  private async ensureCompatibilityColumns(client: PoolClient): Promise<void> {
    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      ADD COLUMN IF NOT EXISTS shard_id INTEGER NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox_dead_letter
      ADD COLUMN IF NOT EXISTS shard_id INTEGER NOT NULL DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_metadata
      ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_metadata
      ADD COLUMN IF NOT EXISTS plan_version TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS plan_id TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS plan_version TEXT
    `);

    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_events
      ADD COLUMN IF NOT EXISTS persisted_at TIMESTAMPTZ
    `);

    // Migration 004: generated status column for index-backed listRuns status filter.
    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.run_snapshots
      ADD COLUMN IF NOT EXISTS snapshot_status TEXT GENERATED ALWAYS AS (snapshot->>'status') STORED
    `);
  }

  private async ensureCompatibilityCleanup(client: PoolClient): Promise<void> {
    // Backward-compat cleanup for older schema revisions:
    // - drop redundant UNIQUE(run_id, run_seq) because id already encodes runId+runSeq
    await client.query(`
      ALTER TABLE ${quoteIdentifier(this.schema)}.outbox
      DROP CONSTRAINT IF EXISTS outbox_run_id_run_seq_key
    `);

    // If an old pending index exists with outdated definition, recreate deterministically.
    await client.query(
      `DROP INDEX IF EXISTS ${quoteIdentifier(this.schema)}.${quoteIdentifier('outbox_pending_idx')}`
    );

    await client.query(
      `DROP INDEX IF EXISTS ${quoteIdentifier(this.schema)}.${quoteIdentifier('outbox_pending_run_order_idx')}`
    );

    // Backward-compat cleanup for previously created redundant run_events index.
    await client.query(
      `DROP INDEX IF EXISTS ${quoteIdentifier(this.schema)}.${quoteIdentifier('run_events_run_id_run_seq_idx')}`
    );
  }

  // ---------------------------------------------------------------------------
  // Indexes
  // ---------------------------------------------------------------------------

  private async ensureIndexes(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE INDEX IF NOT EXISTS outbox_pending_idx
      ON ${quoteIdentifier(this.schema)}.outbox (shard_id, next_attempt_at, created_at, claimed_at)
      WHERE delivered_at IS NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS outbox_dead_letter_run_id_idx
      ON ${quoteIdentifier(this.schema)}.outbox_dead_letter (run_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS outbox_pending_run_order_idx
      ON ${quoteIdentifier(this.schema)}.outbox (shard_id, run_id, run_seq)
      WHERE delivered_at IS NULL
    `);

    // Tenant-scoped listing: listRuns(tenantId) requires this to avoid full scan.
    await client.query(`
      CREATE INDEX IF NOT EXISTS run_metadata_tenant_created_idx
      ON ${quoteIdentifier(this.schema)}.run_metadata (tenant_id, created_at DESC)
    `);

    // Migration 004: index on generated snapshot_status for listRuns status filter.
    await client.query(`
      CREATE INDEX IF NOT EXISTS run_snapshots_snapshot_status_idx
      ON ${quoteIdentifier(this.schema)}.run_snapshots (snapshot_status)
    `);
  }
}
