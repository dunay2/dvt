/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSchemaManagerSql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL used by PostgresSchemaManager orchestration methods
 * @consequence Schema manager class remains focused on migration flow control
 * @version 1.0.0
 * @date 2026-03-26
 */
import { quoteIdentifier } from './sqlUtils.js';

const COMPONENT = 'core';

function sq(schema: string): string {
  return quoteIdentifier(schema);
}

export function coreComponent(): string {
  return COMPONENT;
}

export function advisoryLockSql(): string {
  return 'SELECT pg_advisory_lock(hashtext($1))';
}

export function advisoryUnlockSql(): string {
  return 'SELECT pg_advisory_unlock(hashtext($1))';
}

export function beginTransactionSql(): string {
  return 'BEGIN';
}

export function commitTransactionSql(): string {
  return 'COMMIT';
}

export function rollbackTransactionSql(): string {
  return 'ROLLBACK';
}

export function setLocalStatementTimeoutSql(): string {
  return 'SET LOCAL statement_timeout = $1';
}

export function setTenantContextSql(): string {
  return `SELECT set_config('dvt.tenant_id', $1, true)`;
}

export function createSchemaSql(schema: string): string {
  return `CREATE SCHEMA IF NOT EXISTS ${sq(schema)}`;
}

export function createSchemaMigrationsTableSql(schema: string): string {
  return `
    CREATE TABLE IF NOT EXISTS ${sq(schema)}.schema_migrations (
      component TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (component, version)
    )
  `;
}

export function createSchemaMigrationsIndexSql(schema: string): string {
  return `
    CREATE INDEX IF NOT EXISTS schema_migrations_component_applied_idx
    ON ${sq(schema)}.schema_migrations (component, applied_at DESC)
  `;
}

export function loadAppliedVersionsSql(schema: string): string {
  return `
    SELECT version
    FROM ${sq(schema)}.schema_migrations
    WHERE component = $1
  `;
}

export function stepAlreadyAppliedSql(schema: string): string {
  return `
    SELECT EXISTS (
      SELECT 1
      FROM ${sq(schema)}.schema_migrations
      WHERE component = $1
        AND version = $2
    ) AS exists
  `;
}

export function insertAppliedStepSql(schema: string): string {
  return `
    INSERT INTO ${sq(schema)}.schema_migrations (component, version, description, applied_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (component, version) DO NOTHING
  `;
}

export function deleteAppliedStepSql(schema: string): string {
  return `
    DELETE FROM ${sq(schema)}.schema_migrations
    WHERE component = $1
      AND version = $2
  `;
}
