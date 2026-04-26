/**
 * @file packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Versioned schema migrations for start_run_intents are managed outside repository CRUD logic
 * @consequence PostgresStartRunIntentStore focuses on persistence behavior, while schema evolution is explicit
 * @version 1.0.0
 * @date 2026-03-05
 */
import { type Pool, type PoolClient } from 'pg';

import {
  START_RUN_INTENTS_TENANT_ISOLATION_TABLE,
  buildTenantIsolationPolicySql,
} from './PostgresTenantIsolationPolicy.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

interface StartRunIntentSchemaMigration {
  version: string;
  description: string;
  sql: string;
}

const MIGRATION_COMPONENT = 'start_run_intents';
const ADVISORY_LOCK_KEY_SQL = "(('x' || left(md5($1), 16))::bit(64)::bigint)";
const ACQUIRE_ADVISORY_LOCK_SQL = `SELECT pg_advisory_lock(${ADVISORY_LOCK_KEY_SQL})`;
const RELEASE_ADVISORY_LOCK_SQL = `SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY_SQL})`;

export interface StartRunIntentSchemaManagerConfig {
  pool: Pool;
  schema?: string;
}

export class StartRunIntentSchemaManager {
  private readonly pool: Pool;
  private readonly schema: string;
  private migratePromise: Promise<void> | null = null;

  constructor(config: StartRunIntentSchemaManagerConfig) {
    this.pool = config.pool;
    this.schema = normalizeSchema(config.schema ?? 'dvt');
  }

  async migrate(): Promise<void> {
    this.migratePromise ??= this.applyMigrations().catch((error: unknown) => {
      this.migratePromise = null;
      throw error;
    });
    return this.migratePromise;
  }

  private async applyMigrations(): Promise<void> {
    const schemaLiteral = quoteIdentifier(this.schema);
    const statusType = `${schemaLiteral}.${quoteIdentifier('start_run_intent_status')}`;
    const intentsTable = `${schemaLiteral}.start_run_intents`;
    const migrations = this.getMigrations(statusType, intentsTable);

    const client = await this.pool.connect();
    let hasLock = false;
    try {
      await this.ensureMigrationTable(client, schemaLiteral);
      await client.query(ACQUIRE_ADVISORY_LOCK_SQL, [`${this.schema}:${MIGRATION_COMPONENT}`]);
      hasLock = true;

      for (const migration of migrations) {
        const exists = await client.query<{ exists: boolean }>(
          `
            SELECT EXISTS (
              SELECT 1
              FROM ${schemaLiteral}.schema_migrations
              WHERE component = $1
                AND version = $2
            ) AS exists
          `,
          [MIGRATION_COMPONENT, migration.version]
        );
        if (exists.rows[0]?.exists) {
          continue;
        }

        await client.query('BEGIN');
        try {
          await client.query(migration.sql);
          await client.query(
            `
              INSERT INTO ${schemaLiteral}.schema_migrations (
                component,
                version,
                description,
                applied_at
              )
              VALUES ($1, $2, $3, now())
            `,
            [MIGRATION_COMPONENT, migration.version, migration.description]
          );
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      if (hasLock) {
        await client.query(RELEASE_ADVISORY_LOCK_SQL, [`${this.schema}:${MIGRATION_COMPONENT}`]);
      }
      client.release();
    }
  }

  private async ensureMigrationTable(client: PoolClient, schemaLiteral: string): Promise<void> {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaLiteral}`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaLiteral}.schema_migrations (
        component TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (component, version)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS schema_migrations_component_applied_idx
      ON ${schemaLiteral}.schema_migrations (component, applied_at DESC)
    `);
  }

  private getMigrations(
    statusType: string,
    intentsTable: string
  ): readonly StartRunIntentSchemaMigration[] {
    return [
      {
        version: '20260305_001_start_run_intents_base',
        description: 'Create start_run_intent enum, table and indexes',
        sql: `
          DO $$
          BEGIN
            CREATE TYPE ${statusType} AS ENUM ('PENDING', 'DISPATCHED', 'RESOLVED', 'EXPIRED');
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END
          $$;

          CREATE TABLE IF NOT EXISTS ${intentsTable} (
            intent_id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            run_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            status ${statusType} NOT NULL DEFAULT 'PENDING',
            engine_run_ref JSONB,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL,
            CONSTRAINT dispatched_requires_run_ref
              CHECK (status <> 'DISPATCHED' OR engine_run_ref IS NOT NULL),
            CONSTRAINT engine_run_ref_shape
              CHECK (
                engine_run_ref IS NULL OR (
                  jsonb_typeof(engine_run_ref) = 'object'
                  AND engine_run_ref ? 'provider'
                  AND engine_run_ref ? 'tenantId'
                )
              )
          );

          CREATE INDEX IF NOT EXISTS intents_orphaned_idx
          ON ${intentsTable} (status, created_at ASC)
          WHERE status IN ('PENDING', 'DISPATCHED');

          CREATE INDEX IF NOT EXISTS start_run_intents_tenant_run_idx
          ON ${intentsTable} (tenant_id, run_id);

          CREATE UNIQUE INDEX IF NOT EXISTS start_run_intents_active_run_uniq
          ON ${intentsTable} (tenant_id, run_id)
          WHERE status IN ('PENDING', 'DISPATCHED');
        `,
      },
      {
        version: '20260305_002_start_run_intents_status_enum_upgrade',
        description: 'Upgrade legacy text status to enum',
        sql: `
          DO $$
          DECLARE
            status_data_type text;
            status_udt_name text;
          BEGIN
            SELECT data_type, udt_name
            INTO status_data_type, status_udt_name
            FROM information_schema.columns
            WHERE table_schema = ${toSqlStringLiteral(this.schema)}
              AND table_name = 'start_run_intents'
              AND column_name = 'status';

            IF status_data_type IS NULL THEN
              RETURN;
            END IF;

            IF status_data_type = 'USER-DEFINED' AND status_udt_name = 'start_run_intent_status' THEN
              RETURN;
            END IF;

            EXECUTE ${toSqlStringLiteral(
              `ALTER TABLE ${intentsTable}
               ALTER COLUMN status TYPE ${statusType}
               USING status::text::${statusType}`
            )};
          END
          $$;
        `,
      },
      {
        version: '20260425_003_start_run_intents_rls_baseline',
        description: 'Enable forced RLS for start_run_intents',
        sql: toSqlBatch(
          buildTenantIsolationPolicySql(this.schema, START_RUN_INTENTS_TENANT_ISOLATION_TABLE)
        ),
      },
      {
        version: '20260425_004_start_run_intents_service_owner_rls_hardening',
        description: 'Require approved service access owners for start_run_intents service access',
        sql: toSqlBatch(
          buildTenantIsolationPolicySql(this.schema, START_RUN_INTENTS_TENANT_ISOLATION_TABLE)
        ),
      },
      {
        version: '20260426_005_start_run_intents_table_scoped_service_owner_rls',
        description: 'Restrict start_run_intents service access to its reconciler owner',
        sql: toSqlBatch(
          buildTenantIsolationPolicySql(this.schema, START_RUN_INTENTS_TENANT_ISOLATION_TABLE)
        ),
      },
    ] as const;
  }
}

function toSqlStringLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function toSqlBatch(statements: readonly string[]): string {
  return `${statements.map((statement) => statement.trim()).join(';\n\n')};`;
}
