/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
 *
 * Owns all DDL lifecycle for the DVT Postgres schema.
 *
 * Migrations are applied as named, versioned steps using the shared
 * `schema_migrations` table (same table and schema used by
 * StartRunIntentSchemaManager, keyed by `component = 'core'`).
 *
 * Each step is:
 *   1. Checked for prior application — skipped if already recorded.
 *   2. Executed inside its own BEGIN/COMMIT transaction.
 *   3. Recorded in `schema_migrations` atomically with its DDL.
 *
 * A `pg_advisory_lock` on `'<schema>:core'` prevents concurrent migration
 * races across multiple processes starting simultaneously.
 *
 * This makes the migration runner resumable: a crash between steps leaves
 * all completed steps recorded and only the failed step to be retried.
 *
 * S06 — Migration Version Table (Phase 2 arch debt)
 */
import { Pool, type PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';

type MigrationState = 'not_called' | 'in_progress' | 'ready';

const COMPONENT = 'core';

// ---------------------------------------------------------------------------
// Named migration steps
// ---------------------------------------------------------------------------

interface MigrationStep {
  readonly version: string;
  readonly description: string;
  readonly run: (client: PoolClient, schema: string) => Promise<void>;
  readonly rollbackDescription: string;
  readonly rollback: (client: PoolClient, schema: string) => Promise<void>;
}

export interface PostgresSchemaRollbackPlanStep {
  readonly version: string;
  readonly description: string;
  readonly rollbackDescription: string;
}

export interface PostgresSchemaRollbackPlan {
  readonly component: string;
  readonly schema: string;
  readonly currentVersion: string | null;
  readonly targetVersion: string | null;
  readonly steps: readonly PostgresSchemaRollbackPlanStep[];
}

function sq(schema: string): string {
  return quoteIdentifier(schema);
}

const MIGRATION_STEPS: readonly MigrationStep[] = [
  {
    version: 'core_001_initial_tables',
    description: 'Create run_metadata, run_events, and outbox tables',
    run: async (client, schema) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.run_metadata (
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
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.run_events (
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
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.outbox (
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
    },
    rollbackDescription: 'Drop the base run_metadata, run_events, and outbox tables',
    rollback: async (client, schema) => {
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.outbox`);
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.run_events`);
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.run_metadata`);
    },
  },
  {
    version: 'core_002_run_snapshots_table',
    description: 'Create run_snapshots table',
    run: async (client, schema) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.run_snapshots (
          run_id TEXT PRIMARY KEY,
          snapshot JSONB NOT NULL,
          snapshot_status TEXT GENERATED ALWAYS AS (snapshot->>'status') STORED,
          last_run_seq INTEGER NOT NULL,
          archive_unit_key TEXT,
          event_checksum_sha256 TEXT,
          archived_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);
    },
    rollbackDescription: 'Drop the run_snapshots table',
    rollback: async (client, schema) => {
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.run_snapshots`);
    },
  },
  {
    version: 'core_003_outbox_dead_letter_table',
    description: 'Create outbox_dead_letter table',
    run: async (client, schema) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.outbox_dead_letter (
          id TEXT PRIMARY KEY,
          original_id TEXT NOT NULL,
          run_id TEXT NOT NULL,
          shard_id INTEGER NOT NULL DEFAULT 0,
          payload JSONB NOT NULL,
          last_error TEXT NOT NULL,
          dead_lettered_at TIMESTAMPTZ NOT NULL
        )
      `);
    },
    rollbackDescription: 'Drop the outbox_dead_letter table',
    rollback: async (client, schema) => {
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.outbox_dead_letter`);
    },
  },
  {
    version: 'core_004_lineage_tables',
    description: 'Create lineage_outbox and lineage_dead_letter tables',
    run: async (client, schema) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.lineage_outbox (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload JSONB NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.lineage_dead_letter (
          id TEXT PRIMARY KEY,
          original_id TEXT NOT NULL,
          run_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload JSONB NOT NULL,
          last_error TEXT NOT NULL,
          dead_lettered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    },
    rollbackDescription: 'Drop the lineage outbox and dead-letter tables',
    rollback: async (client, schema) => {
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.lineage_dead_letter`);
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.lineage_outbox`);
    },
  },
  {
    version: 'core_005_archive_catalog_tables',
    description: 'Create run_event_archive_units and run_event_archive_batches tables',
    run: async (client, schema) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.run_event_archive_units (
          archive_unit_key TEXT PRIMARY KEY,
          tenant_bucket TEXT NOT NULL,
          persisted_at_day DATE NOT NULL,
          state TEXT NOT NULL,
          tenant_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
          tenant_count INTEGER NOT NULL DEFAULT 0,
          row_count BIGINT NOT NULL DEFAULT 0,
          min_run_seq INTEGER,
          max_run_seq INTEGER,
          object_key TEXT,
          checksum_sha256 TEXT,
          exported_at TIMESTAMPTZ,
          verified_at TIMESTAMPTZ,
          delete_after TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.run_event_archive_batches (
          batch_id TEXT PRIMARY KEY,
          archive_unit_key TEXT NOT NULL REFERENCES ${sq(schema)}.run_event_archive_units (archive_unit_key)
            ON DELETE CASCADE,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          status TEXT NOT NULL,
          row_count BIGINT,
          checksum_sha256 TEXT,
          error TEXT
        )
      `);
    },
    rollbackDescription: 'Drop the archive catalog tables',
    rollback: async (client, schema) => {
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.run_event_archive_batches`);
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.run_event_archive_units`);
    },
  },
  {
    version: 'core_006_archive_lease_restore_tables',
    description: 'Create run_event_archive_leases and run_event_archive_restore_log tables',
    run: async (client, schema) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.run_event_archive_leases (
          worker_id TEXT PRIMARY KEY,
          lease_token TEXT NOT NULL,
          acquired_at TIMESTAMPTZ NOT NULL,
          renewed_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(schema)}.run_event_archive_restore_log (
          restore_id TEXT PRIMARY KEY,
          archive_unit_key TEXT,
          run_id TEXT,
          target_schema TEXT NOT NULL,
          requester_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL,
          rows_restored BIGINT,
          started_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ,
          error TEXT
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS archive_restore_log_unit_key_idx
        ON ${sq(schema)}.run_event_archive_restore_log (archive_unit_key)
        WHERE archive_unit_key IS NOT NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS archive_restore_log_run_id_idx
        ON ${sq(schema)}.run_event_archive_restore_log (run_id)
        WHERE run_id IS NOT NULL
      `);
    },
    rollbackDescription: 'Drop the archive lease and restore-log tables',
    rollback: async (client, schema) => {
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.run_event_archive_restore_log`);
      await client.query(`DROP TABLE IF EXISTS ${sq(schema)}.run_event_archive_leases`);
    },
  },
  {
    version: 'core_007_compat_columns',
    description: 'Add backward-compatibility columns via ALTER TABLE IF NOT EXISTS',
    run: async (client, schema) => {
      await client.query(
        `ALTER TABLE ${sq(schema)}.outbox ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.outbox ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.outbox ADD COLUMN IF NOT EXISTS shard_id INTEGER NOT NULL DEFAULT 0`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.outbox_dead_letter ADD COLUMN IF NOT EXISTS shard_id INTEGER NOT NULL DEFAULT 0`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_metadata ADD COLUMN IF NOT EXISTS plan_id TEXT`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_metadata ADD COLUMN IF NOT EXISTS plan_version TEXT`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_events ADD COLUMN IF NOT EXISTS plan_id TEXT`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_events ADD COLUMN IF NOT EXISTS plan_version TEXT`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_events ADD COLUMN IF NOT EXISTS persisted_at TIMESTAMPTZ`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_snapshots ADD COLUMN IF NOT EXISTS snapshot_status TEXT GENERATED ALWAYS AS (snapshot->>'status') STORED`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_snapshots ADD COLUMN IF NOT EXISTS archive_unit_key TEXT`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_snapshots ADD COLUMN IF NOT EXISTS event_checksum_sha256 TEXT`
      );
      await client.query(
        `ALTER TABLE ${sq(schema)}.run_snapshots ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`
      );
    },
    rollbackDescription:
      'Remove only the migration bookkeeping because the compatibility columns are now part of the canonical baseline',
    rollback: async () => {
      // No physical rollback: the compatibility columns have been merged into the
      // canonical schema definitions for fresh installs, so removing them here
      // would over-rollback the baseline.
    },
  },
  {
    version: 'core_008_compat_cleanup',
    description: 'Drop stale constraints and indexes superseded by later migrations',
    run: async (client, schema) => {
      await client.query(
        `ALTER TABLE ${sq(schema)}.outbox DROP CONSTRAINT IF EXISTS outbox_run_id_run_seq_key`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('outbox_pending_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('outbox_pending_run_order_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('run_events_run_id_run_seq_idx')}`
      );
    },
    rollbackDescription:
      'Restore the compatibility constraint and indexes removed by the cleanup step',
    rollback: async (client, schema) => {
      await client.query(
        `ALTER TABLE ${sq(schema)}.outbox ADD CONSTRAINT outbox_run_id_run_seq_key UNIQUE (run_id, run_seq)`
      );
      await client.query(`
        CREATE INDEX IF NOT EXISTS outbox_pending_idx
        ON ${sq(schema)}.outbox (shard_id, next_attempt_at, created_at, claimed_at)
        WHERE delivered_at IS NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS outbox_pending_run_order_idx
        ON ${sq(schema)}.outbox (shard_id, run_id, run_seq)
        WHERE delivered_at IS NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS run_events_run_id_run_seq_idx
        ON ${sq(schema)}.run_events (run_id, run_seq)
      `);
    },
  },
  {
    version: 'core_009_core_indexes',
    description: 'Create all standard operational indexes',
    run: async (client, schema) => {
      await client.query(`
        CREATE INDEX IF NOT EXISTS outbox_pending_idx
        ON ${sq(schema)}.outbox (shard_id, next_attempt_at, created_at, claimed_at)
        WHERE delivered_at IS NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS outbox_dead_letter_run_id_idx
        ON ${sq(schema)}.outbox_dead_letter (run_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS outbox_pending_run_order_idx
        ON ${sq(schema)}.outbox (shard_id, run_id, run_seq)
        WHERE delivered_at IS NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS run_metadata_tenant_created_idx
        ON ${sq(schema)}.run_metadata (tenant_id, created_at DESC)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS run_snapshots_snapshot_status_idx
        ON ${sq(schema)}.run_snapshots (snapshot_status)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS run_snapshots_archive_unit_key_idx
        ON ${sq(schema)}.run_snapshots (archive_unit_key)
        WHERE archive_unit_key IS NOT NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS lineage_outbox_pending_idx
        ON ${sq(schema)}.lineage_outbox (created_at)
        WHERE status = 'pending'
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS lineage_outbox_run_id_idx
        ON ${sq(schema)}.lineage_outbox (run_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS lineage_dead_letter_run_id_idx
        ON ${sq(schema)}.lineage_dead_letter (run_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS run_event_archive_units_state_day_idx
        ON ${sq(schema)}.run_event_archive_units (state, persisted_at_day)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS run_event_archive_units_delete_after_idx
        ON ${sq(schema)}.run_event_archive_units (delete_after)
        WHERE delete_after IS NOT NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS run_event_archive_batches_unit_status_idx
        ON ${sq(schema)}.run_event_archive_batches (archive_unit_key, status)
      `);
    },
    rollbackDescription: 'Drop the standard operational indexes introduced by the core index step',
    rollback: async (client, schema) => {
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('outbox_pending_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('outbox_dead_letter_run_id_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('outbox_pending_run_order_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('run_metadata_tenant_created_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('run_snapshots_snapshot_status_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('run_snapshots_archive_unit_key_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('lineage_outbox_pending_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('lineage_outbox_run_id_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('lineage_dead_letter_run_id_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('run_event_archive_units_state_day_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('run_event_archive_units_delete_after_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('run_event_archive_batches_unit_status_idx')}`
      );
    },
  },
  {
    version: 'core_010_purge_indexes',
    description: 'Create partial indexes for delivery buffer purge scans (G5-PR3)',
    run: async (client, schema) => {
      await client.query(`
        CREATE INDEX IF NOT EXISTS outbox_delivered_at_idx
        ON ${sq(schema)}.outbox (delivered_at)
        WHERE delivered_at IS NOT NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS outbox_dead_letter_dead_lettered_at_idx
        ON ${sq(schema)}.outbox_dead_letter (dead_lettered_at)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS lineage_dead_letter_dead_lettered_at_idx
        ON ${sq(schema)}.lineage_dead_letter (dead_lettered_at)
      `);
    },
    rollbackDescription: 'Drop the delivery-buffer purge indexes',
    rollback: async (client, schema) => {
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('outbox_delivered_at_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('outbox_dead_letter_dead_lettered_at_idx')}`
      );
      await client.query(
        `DROP INDEX IF EXISTS ${sq(schema)}.${quoteIdentifier('lineage_dead_letter_dead_lettered_at_idx')}`
      );
    },
  },
];

// ---------------------------------------------------------------------------
// PostgresSchemaManager
// ---------------------------------------------------------------------------

export class PostgresSchemaManager {
  private migrationState: MigrationState = 'not_called';
  private migratePromise: Promise<void> | null = null;

  constructor(
    private readonly pool: Pool,
    private readonly schema: string,
    private readonly statementTimeoutMs = 0
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Runs all DDL migrations using named versioned steps recorded in
   * `schema_migrations`. Steps already applied are skipped.
   *
   * Safe to call multiple times — subsequent calls are no-ops once `ready`.
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

  async planRollback(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    return this.createRollbackPlan(targetVersion);
  }

  async rollbackTo(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    const plan = await this.createRollbackPlan(targetVersion);
    if (plan.steps.length === 0) {
      return plan;
    }

    const client = await this.pool.connect();
    let hasLock = false;
    try {
      await client.query('SELECT pg_advisory_lock(hashtext($1))', [`${this.schema}:${COMPONENT}`]);
      hasLock = true;

      for (const plannedStep of plan.steps) {
        const step = this.resolveStep(plannedStep.version);
        await this.rollbackStep(client, step);
      }
    } finally {
      if (hasLock) {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [
          `${this.schema}:${COMPONENT}`,
        ]);
      }
      client.release();
    }

    this.migratePromise = null;
    this.migrationState = 'not_called';
    return plan;
  }

  /** Marks the schema as already ready, bypassing DDL execution. */
  markReady(): void {
    this.migrationState = 'ready';
  }

  /** Throws if migrate() has not been called and completed successfully. */
  ready(): void {
    if (this.migrationState === 'not_called') {
      throw new Error('MIGRATE_NOT_CALLED: call await adapter.migrate() before using the adapter');
    }
    if (this.migrationState === 'in_progress') {
      throw new Error('MIGRATE_IN_PROGRESS: await adapter.migrate() before using the adapter');
    }
  }

  /** Sets `dvt.tenant_id` as a transaction-local Postgres config parameter. */
  static async setTenantContext(client: PoolClient, tenantId: string): Promise<void> {
    await client.query(`SELECT set_config('dvt.tenant_id', $1, true)`, [tenantId]);
  }

  // ---------------------------------------------------------------------------
  // Migration runner
  // ---------------------------------------------------------------------------

  private async runMigrations(): Promise<void> {
    // Phase 0: ensure the shared schema_migrations table exists.
    // Runs outside any migration step so it is always present before step checks.
    await this.ensureMigrationsTable();

    // Phase 1: apply named steps under an advisory lock to prevent races.
    const client = await this.pool.connect();
    let hasLock = false;
    try {
      await client.query('SELECT pg_advisory_lock(hashtext($1))', [`${this.schema}:${COMPONENT}`]);
      hasLock = true;

      for (const step of MIGRATION_STEPS) {
        await this.applyStep(client, step);
      }
    } finally {
      if (hasLock) {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [
          `${this.schema}:${COMPONENT}`,
        ]);
      }
      client.release();
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${sq(this.schema)}`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${sq(this.schema)}.schema_migrations (
          component TEXT NOT NULL,
          version TEXT NOT NULL,
          description TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (component, version)
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS schema_migrations_component_applied_idx
        ON ${sq(this.schema)}.schema_migrations (component, applied_at DESC)
      `);
    } finally {
      client.release();
    }
  }

  private async createRollbackPlan(
    targetVersion: string | null
  ): Promise<PostgresSchemaRollbackPlan> {
    const targetIndex = this.resolveTargetIndex(targetVersion);
    const appliedVersions = await this.loadAppliedVersions();
    const appliedSet = new Set(appliedVersions);

    if (targetVersion !== null && !appliedSet.has(targetVersion)) {
      throw new Error(`ROLLBACK_TARGET_NOT_APPLIED: ${targetVersion}`);
    }

    const appliedSteps = MIGRATION_STEPS.filter((step) => appliedSet.has(step.version));
    const steps = appliedSteps
      .filter((step) => this.resolveTargetIndex(step.version) > targetIndex)
      .reverse()
      .map<PostgresSchemaRollbackPlanStep>((step) => ({
        version: step.version,
        description: step.description,
        rollbackDescription: step.rollbackDescription,
      }));

    return {
      component: COMPONENT,
      schema: this.schema,
      currentVersion: appliedSteps.at(-1)?.version ?? null,
      targetVersion,
      steps,
    };
  }

  private resolveTargetIndex(targetVersion: string | null): number {
    if (targetVersion === null) {
      return -1;
    }

    const index = MIGRATION_STEPS.findIndex((step) => step.version === targetVersion);
    if (index === -1) {
      throw new Error(`UNKNOWN_MIGRATION_VERSION: ${targetVersion}`);
    }
    return index;
  }

  private resolveStep(version: string): MigrationStep {
    const step = MIGRATION_STEPS.find((candidate) => candidate.version === version);
    if (step === undefined) {
      throw new Error(`UNKNOWN_MIGRATION_VERSION: ${version}`);
    }
    return step;
  }

  private async loadAppliedVersions(): Promise<string[]> {
    await this.ensureMigrationsTable();

    const client = await this.pool.connect();
    try {
      const result = await client.query<{ version: string }>(
        `
          SELECT version
          FROM ${sq(this.schema)}.schema_migrations
          WHERE component = $1
        `,
        [COMPONENT]
      );
      const appliedSet = new Set(result.rows.map((row) => row.version));
      return MIGRATION_STEPS.filter((step) => appliedSet.has(step.version)).map(
        (step) => step.version
      );
    } finally {
      client.release();
    }
  }

  private async applyStep(client: PoolClient, step: MigrationStep): Promise<void> {
    const exists = await client.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM ${sq(this.schema)}.schema_migrations
          WHERE component = $1
            AND version = $2
        ) AS exists
      `,
      [COMPONENT, step.version]
    );
    if (exists.rows[0]?.exists) return;

    await client.query('BEGIN');
    try {
      if (this.statementTimeoutMs > 0) {
        await client.query('SET LOCAL statement_timeout = $1', [this.statementTimeoutMs]);
      }
      await step.run(client, this.schema);
      await client.query(
        `
          INSERT INTO ${sq(this.schema)}.schema_migrations (component, version, description, applied_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (component, version) DO NOTHING
        `,
        [COMPONENT, step.version, step.description]
      );
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Connection may be torn down.
      }
      throw error;
    }
  }

  private async rollbackStep(client: PoolClient, step: MigrationStep): Promise<void> {
    await client.query('BEGIN');
    try {
      if (this.statementTimeoutMs > 0) {
        await client.query('SET LOCAL statement_timeout = $1', [this.statementTimeoutMs]);
      }
      await step.rollback(client, this.schema);
      await client.query(
        `
          DELETE FROM ${sq(this.schema)}.schema_migrations
          WHERE component = $1
            AND version = $2
        `,
        [COMPONENT, step.version]
      );
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Connection may be torn down.
      }
      throw error;
    }
  }
}
