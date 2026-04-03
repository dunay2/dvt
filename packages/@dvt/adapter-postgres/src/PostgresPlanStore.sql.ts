import { quoteIdentifier } from './sqlUtils.js';

export function sqlCreateStoredPlansTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.stored_plans (
      plan_id TEXT PRIMARY KEY,
      plan_version TEXT NOT NULL,
      plan_uri TEXT NOT NULL UNIQUE,
      plan_sha256 TEXT NOT NULL,
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

export function sqlCreateStoredPlansValidationStateIndex(schema: string): string {
  return `
    CREATE INDEX IF NOT EXISTS stored_plans_validation_state_idx
    ON ${quoteIdentifier(schema)}.stored_plans (validation_state, updated_at DESC)
  `;
}

export function sqlCreatePlanRecordsTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.plan_records (
      plan_id TEXT PRIMARY KEY,
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
      archived_at TIMESTAMPTZ
    )
  `;
}

export function sqlCreatePlanExecutabilityRecordsTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.plan_executability_records (
      plan_id TEXT NOT NULL REFERENCES ${quoteIdentifier(schema)}.plan_records(plan_id) ON DELETE CASCADE,
      adapter_id TEXT NOT NULL,
      state TEXT NOT NULL,
      validated_at TIMESTAMPTZ,
      rejection_report_json JSONB,
      PRIMARY KEY (plan_id, adapter_id)
    )
  `;
}

export function sqlCreatePlanAdmissionLinksTable(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.plan_admission_links (
      plan_id TEXT NOT NULL REFERENCES ${quoteIdentifier(schema)}.plan_records(plan_id) ON DELETE CASCADE,
      run_id TEXT NOT NULL,
      adapter_id TEXT NOT NULL,
      admitted_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (plan_id, run_id, adapter_id)
    )
  `;
}

export function sqlBackfillPlanRecordsFromStoredPlans(schema: string): string {
  return `
    INSERT INTO ${quoteIdentifier(schema)}.plan_records (
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
    ON CONFLICT (plan_id) DO NOTHING
  `;
}
