/**
 * @ownedConcern Initialize or verify the single supported intent schema without converting old data.
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @baseline ADR-0031: Tenant-isolated storage
 * @decision Reject incompatible intent tables before DDL or data mutation.
 * @consequence Deployment requires an explicit, evidence-backed hard cut, never implicit backfill.
 * @version 1.0.0
 */
import type { Pool, PoolClient } from 'pg';

import {
  START_RUN_INTENTS_TENANT_ISOLATION_TABLE,
  buildTenantIsolationPolicySql,
} from './PostgresTenantIsolationPolicy.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

const COMPONENT = 'start_run_intents';
const SCHEMA_ID = '20260930_owned_start_protocol';
const LOCK_KEY = "(('x' || left(md5($1), 16))::bit(64)::bigint)";
const INCOMPATIBLE = 'START_RUN_INTENT_SCHEMA_INCOMPATIBLE: explicit classified hard cut required';

export interface StartRunIntentSchemaManagerConfig {
  pool: Pool;
  schema?: string;
}

export class StartRunIntentSchemaManager {
  private readonly schema: string;
  private migratePromise: Promise<void> | null = null;

  constructor(private readonly config: StartRunIntentSchemaManagerConfig) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
  }

  migrate(): Promise<void> {
    this.migratePromise ??= this.initializeOrVerify().catch((error: unknown) => {
      this.migratePromise = null;
      throw error;
    });
    return this.migratePromise;
  }

  private async initializeOrVerify(): Promise<void> {
    const client = await this.config.pool.connect();
    let locked = false;
    try {
      await client.query(`SELECT pg_advisory_lock(${LOCK_KEY})`, [`${this.schema}:${COMPONENT}`]);
      locked = true;
      const existing = await client.query<{ relation: string | null }>(
        'SELECT to_regclass($1)::text AS relation',
        [`${quoteIdentifier(this.schema)}.start_run_intents`]
      );
      if (existing.rows[0]?.relation != null) {
        await this.verify(client);
        return;
      }
      await client.query('BEGIN');
      try {
        await client.query(this.initialSchemaSql());
        for (const sql of buildTenantIsolationPolicySql(
          this.schema,
          START_RUN_INTENTS_TENANT_ISOLATION_TABLE
        ))
          await client.query(sql);
        await client.query(
          `INSERT INTO ${quoteIdentifier(this.schema)}.schema_migrations (component, version, description, applied_at)
           VALUES ($1, $2, $3, clock_timestamp())`,
          [
            COMPONENT,
            SCHEMA_ID,
            'Exclusive start ownership protocol; initialize only, no legacy conversion',
          ]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      try {
        if (locked)
          await client.query(`SELECT pg_advisory_unlock(${LOCK_KEY})`, [
            `${this.schema}:${COMPONENT}`,
          ]);
      } finally {
        client.release();
      }
    }
  }

  private async verify(client: PoolClient): Promise<void> {
    const registry = await client.query<{ relation: string | null }>(
      'SELECT to_regclass($1)::text AS relation',
      [`${quoteIdentifier(this.schema)}.schema_migrations`]
    );
    if (registry.rows[0]?.relation == null) throw new Error(INCOMPATIBLE);
    const recorded = await client.query<{ present: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM ${quoteIdentifier(this.schema)}.schema_migrations
        WHERE component = $1 AND version = $2) AS present`,
      [COMPONENT, SCHEMA_ID]
    );
    if (recorded.rows[0]?.present !== true) throw new Error(INCOMPATIBLE);
    const shape = await client.query<{
      column_name: string;
      udt_name: string;
      is_nullable: string;
    }>(
      `SELECT column_name, udt_name, is_nullable FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = 'start_run_intents' ORDER BY column_name`,
      [this.schema]
    );
    const expected = [
      ['claim_token', 'uuid', 'NO'],
      ['compensation', 'jsonb', 'NO'],
      ['created_at', 'timestamptz', 'NO'],
      ['intent_id', 'text', 'NO'],
      ['next_reconcile_at', 'timestamptz', 'YES'],
      ['provider', 'text', 'NO'],
      ['provider_outcome', 'jsonb', 'NO'],
      ['reconciliation', 'jsonb', 'NO'],
      ['revision', 'int4', 'NO'],
      ['run_id', 'text', 'NO'],
      ['status', 'start_run_intent_status', 'NO'],
      ['tenant_id', 'text', 'NO'],
      ['updated_at', 'timestamptz', 'NO'],
    ];
    const actual = shape.rows.map((row) => [row.column_name, row.udt_name, row.is_nullable]);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(INCOMPATIBLE);
    const security = await client.query<{ protected: boolean }>(
      `SELECT relrowsecurity AND relforcerowsecurity AS protected FROM pg_class WHERE oid = to_regclass($1)`,
      [`${quoteIdentifier(this.schema)}.start_run_intents`]
    );
    if (security.rows[0]?.protected !== true) throw new Error(INCOMPATIBLE);
  }

  private initialSchemaSql(): string {
    const schema = quoteIdentifier(this.schema);
    return `
      CREATE SCHEMA IF NOT EXISTS ${schema};
      CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
        component TEXT NOT NULL, version TEXT NOT NULL, description TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (component, version)
      );
      CREATE TYPE ${schema}.start_run_intent_status AS ENUM ('PENDING', 'DISPATCHED', 'RESOLVED', 'EXPIRED');
      CREATE TABLE ${schema}.start_run_intents (
        intent_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, run_id TEXT NOT NULL,
        provider TEXT NOT NULL, status ${schema}.start_run_intent_status NOT NULL DEFAULT 'PENDING',
        provider_outcome JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
        compensation JSONB NOT NULL, reconciliation JSONB NOT NULL, next_reconcile_at TIMESTAMPTZ,
        revision INTEGER NOT NULL CHECK (revision >= 0), claim_token UUID NOT NULL,
        CONSTRAINT provider_outcome_shape CHECK ((jsonb_typeof(provider_outcome) = 'object' AND provider_outcome ? 'kind' AND (
          provider_outcome = '{"kind":"not_requested"}'::jsonb OR
          (provider_outcome->>'kind' = 'unknown' AND jsonb_typeof(provider_outcome->'since') = 'string' AND provider_outcome->>'reasonCode' = 'start_requested') OR
          (provider_outcome->>'kind' = 'started' AND jsonb_typeof(provider_outcome->'runRef') = 'object'
            AND provider_outcome->'runRef'->>'provider' = provider AND provider_outcome->'runRef'->>'tenantId' = tenant_id)
        )) IS TRUE),
        CONSTRAINT dispatched_requires_started_outcome CHECK ((status <> 'DISPATCHED' OR provider_outcome->>'kind' = 'started') IS TRUE),
        CONSTRAINT unknown_stays_pending CHECK ((provider_outcome->>'kind' <> 'unknown' OR status = 'PENDING') IS TRUE),
        CONSTRAINT expired_was_not_requested CHECK ((status <> 'EXPIRED' OR provider_outcome->>'kind' = 'not_requested') IS TRUE),
        CONSTRAINT compensation_shape CHECK ((
          compensation = '{"kind":"not_required"}'::jsonb OR
          (compensation->>'kind' = 'required' AND provider_outcome->>'kind' = 'started'
            AND jsonb_typeof(compensation->'reason') = 'string' AND jsonb_typeof(compensation->'since') = 'string') OR
          (compensation->>'kind' = 'confirmed' AND provider_outcome->>'kind' = 'started'
            AND jsonb_typeof(compensation->'executionId') = 'string' AND jsonb_typeof(compensation->'confirmedAt') = 'string'
            AND compensation->>'disposition' IN ('cancelled', 'terminated'))
        ) IS TRUE),
        CONSTRAINT reconciliation_shape CHECK ((jsonb_typeof(reconciliation->'attempts') = 'number'
          AND (reconciliation->>'attempts')::integer BETWEEN 0 AND 8 AND (
            (reconciliation->>'kind' = 'pending' AND jsonb_typeof(reconciliation->'nextAttemptAt') = 'string') OR
            (reconciliation->>'kind' = 'escalated' AND jsonb_typeof(reconciliation->'reason') = 'string' AND jsonb_typeof(reconciliation->'since') = 'string')
          )) IS TRUE),
        CONSTRAINT reconciliation_due_projection CHECK (next_reconcile_at IS NOT DISTINCT FROM
          CASE WHEN reconciliation->>'kind' = 'pending' THEN (reconciliation->>'nextAttemptAt')::timestamptz END),
        CONSTRAINT unresolved_compensation CHECK ((status NOT IN ('RESOLVED', 'EXPIRED') OR
          (compensation->>'kind' <> 'required' AND reconciliation->>'kind' <> 'escalated')) IS TRUE),
        CONSTRAINT resolved_requires_started CHECK ((status <> 'RESOLVED' OR provider_outcome->>'kind' = 'started') IS TRUE)
      );
      CREATE INDEX intents_orphaned_idx ON ${schema}.start_run_intents (next_reconcile_at, updated_at, created_at, intent_id)
        WHERE status IN ('PENDING', 'DISPATCHED') AND reconciliation->>'kind' = 'pending';
      CREATE INDEX start_run_intents_tenant_run_idx ON ${schema}.start_run_intents (tenant_id, run_id);
      CREATE UNIQUE INDEX start_run_intents_active_run_uniq ON ${schema}.start_run_intents (tenant_id, run_id)
        WHERE status IN ('PENDING', 'DISPATCHED');
    `;
  }
}
