/**
 * Owned concern: define scoped plan-store Postgres DDL.
 */
import { quoteIdentifier } from './sqlUtils.js';

export function sqlCreateStoredPlansTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.stored_plans (
      plan_id TEXT PRIMARY KEY,
      plan_version TEXT NOT NULL,
      plan_uri TEXT NOT NULL UNIQUE,
      plan_sha256 TEXT NOT NULL,
      plugin_compatibility_fingerprint TEXT,
      schema_version TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      requires_capabilities JSONB,
      canonical_plan_json TEXT NOT NULL,
      executable_plan_json TEXT NOT NULL,
      validation_state TEXT NOT NULL,
      rejection_report_json JSONB,
      stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export function sqlEnsureStoredPlansCompatibilityFingerprintColumn(schema: string): string {
  return `
    ALTER TABLE ${quoteIdentifier(schema)}.stored_plans
      ADD COLUMN IF NOT EXISTS plugin_compatibility_fingerprint TEXT
  `;
}

export function sqlBackfillStoredPlansCompatibilityFingerprint(schema: string): string {
  return `
    UPDATE ${quoteIdentifier(schema)}.stored_plans
    SET plugin_compatibility_fingerprint =
      NULLIF(executable_plan_json::jsonb #>> '{metadata,pluginCompatibilityFingerprint}', '')
    WHERE plugin_compatibility_fingerprint IS NULL
  `;
}

export function sqlCreateStoredPlansValidationStateIndex(schema: string): string {
  return `
    CREATE INDEX IF NOT EXISTS stored_plans_validation_state_idx
    ON ${quoteIdentifier(schema)}.stored_plans (validation_state, updated_at DESC)
  `;
}

export function sqlCreatePlanRecordsTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.plan_records (
      tenant_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      canonical_plan_json TEXT NOT NULL,
      canonical_hash TEXT NOT NULL,
      plan_version TEXT NOT NULL,
      schema_version TEXT NOT NULL,
      contract_version TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      state TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      derived_from_plan_id TEXT,
      supersedes_plan_id TEXT,
      archived_at TIMESTAMPTZ,
      PRIMARY KEY (tenant_id, project_id, environment_id, plan_id),
      CONSTRAINT plan_records_derived_from_scoped_plan_id_fkey
        FOREIGN KEY (tenant_id, project_id, environment_id, derived_from_plan_id)
        REFERENCES ${quoteIdentifier(schema)}.plan_records(tenant_id, project_id, environment_id, plan_id),
      CONSTRAINT plan_records_supersedes_scoped_plan_id_fkey
        FOREIGN KEY (tenant_id, project_id, environment_id, supersedes_plan_id)
        REFERENCES ${quoteIdentifier(schema)}.plan_records(tenant_id, project_id, environment_id, plan_id)
    )
  `;
}

export function sqlAssertPlanRecordsScopedShape(schema: string): string {
  return `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = ${quoteLiteral(schema)}
          AND table_name = 'plan_records'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ${quoteLiteral(schema)}
          AND table_name = 'plan_records'
          AND column_name = 'tenant_id'
      ) THEN
        RAISE EXCEPTION 'PLAN_RECORDS_SCOPE_MIGRATION_REQUIRED';
      END IF;
    END
    $$;
  `;
}

export function sqlEnsurePlanRecordLineageConstraints(schema: string): string {
  return `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.contype = 'f'
          AND c.conname = 'plan_records_derived_from_scoped_plan_id_fkey'
          AND n.nspname = ${quoteLiteral(schema)}
          AND t.relname = 'plan_records'
      ) THEN
        ALTER TABLE ${quoteIdentifier(schema)}.plan_records
          ADD CONSTRAINT plan_records_derived_from_scoped_plan_id_fkey
          FOREIGN KEY (tenant_id, project_id, environment_id, derived_from_plan_id)
          REFERENCES ${quoteIdentifier(schema)}.plan_records(tenant_id, project_id, environment_id, plan_id);
      END IF;
    END
    $$;
  `;
}

export function sqlEnsurePlanRecordSupersedesConstraints(schema: string): string {
  return `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.contype = 'f'
          AND c.conname = 'plan_records_supersedes_scoped_plan_id_fkey'
          AND n.nspname = ${quoteLiteral(schema)}
          AND t.relname = 'plan_records'
      ) THEN
        ALTER TABLE ${quoteIdentifier(schema)}.plan_records
          ADD CONSTRAINT plan_records_supersedes_scoped_plan_id_fkey
          FOREIGN KEY (tenant_id, project_id, environment_id, supersedes_plan_id)
          REFERENCES ${quoteIdentifier(schema)}.plan_records(tenant_id, project_id, environment_id, plan_id);
      END IF;
    END
    $$;
  `;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function sqlCreatePlanExecutabilityRecordsTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.plan_executability_records (
      tenant_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      adapter_id TEXT NOT NULL,
      state TEXT NOT NULL,
      validated_at TIMESTAMPTZ,
      rejection_report_json JSONB,
      PRIMARY KEY (tenant_id, project_id, environment_id, plan_id, adapter_id),
      FOREIGN KEY (tenant_id, project_id, environment_id, plan_id)
        REFERENCES ${quoteIdentifier(schema)}.plan_records(tenant_id, project_id, environment_id, plan_id)
        ON DELETE CASCADE
    )
  `;
}

export function sqlCreatePlanAdmissionLinksTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.plan_admission_links (
      tenant_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      adapter_id TEXT NOT NULL,
      admitted_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (tenant_id, project_id, environment_id, plan_id, run_id, adapter_id),
      FOREIGN KEY (tenant_id, project_id, environment_id, plan_id)
        REFERENCES ${quoteIdentifier(schema)}.plan_records(tenant_id, project_id, environment_id, plan_id)
        ON DELETE CASCADE
    )
  `;
}

export function sqlAssertStoredPlansCanonicalOwnership(schema: string): string {
  return `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM ${quoteIdentifier(schema)}.stored_plans sp
        WHERE NULLIF(sp.canonical_plan_json::jsonb #>> '{metadata,ownership,tenantId}', '') IS NULL
           OR NULLIF(sp.canonical_plan_json::jsonb #>> '{metadata,ownership,projectId}', '') IS NULL
           OR NULLIF(sp.canonical_plan_json::jsonb #>> '{metadata,ownership,environmentId}', '') IS NULL
      ) THEN
        RAISE EXCEPTION 'PLAN_STORE_BACKFILL_SCOPE_MISSING';
      END IF;
    END
    $$;
  `;
}

export function sqlBackfillPlanRecordsFromStoredPlans(schema: string): string {
  return `
    INSERT INTO ${quoteIdentifier(schema)}.plan_records (
      tenant_id,
      project_id,
      environment_id,
      plan_id,
      canonical_plan_json,
      canonical_hash,
      plan_version,
      schema_version,
      contract_version,
      source_ref,
      state,
      created_at,
      updated_at
    )
    SELECT
      sp.canonical_plan_json::jsonb #>> '{metadata,ownership,tenantId}',
      sp.canonical_plan_json::jsonb #>> '{metadata,ownership,projectId}',
      sp.canonical_plan_json::jsonb #>> '{metadata,ownership,environmentId}',
      sp.plan_id,
      sp.canonical_plan_json,
      sp.plan_sha256,
      sp.plan_version,
      sp.schema_version,
      COALESCE((sp.canonical_plan_json::jsonb #>> '{metadata,contractVersion}'), '1.0.0'),
      sp.plan_uri,
      'ACTIVE',
      sp.stored_at,
      sp.updated_at
    FROM ${quoteIdentifier(schema)}.stored_plans sp
    ON CONFLICT (tenant_id, project_id, environment_id, plan_id) DO NOTHING
  `;
}
