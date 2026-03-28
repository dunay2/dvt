/**
 * @file packages/@dvt/adapter-postgres/src/PostgresAdapterConstants.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Centralize adapter-level defaults and protocol literals
 * @consequence Runtime and reader implementations avoid magic numbers/strings
 * @version 1.0.0
 * @date 2026-03-28
 */
export const POSTGRES_ADAPTER_RUNTIME_CONSTANTS = Object.freeze({
  defaultSchema: 'dvt',
  statementTimeoutEnvVar: 'DVT_PG_STATEMENT_TIMEOUT_MS',
  queryTimeoutEnvVar: 'DVT_PG_QUERY_TIMEOUT_MS',
  postgresUrlEnvVar: 'DVT_PG_URL',
  databaseUrlEnvVar: 'DATABASE_URL',
  defaultTimeoutMs: 0,
});

export const POSTGRES_ADAPTER_ERROR_CONSTANTS = Object.freeze({
  tenantScopeRequiredErrorMessage: 'TENANT_SCOPE_REQUIRED',
  schemaRollbackActiveClientsErrorMessage: 'SCHEMA_ROLLBACK_ACTIVE_CLIENTS',
  missingConnectionStringErrorMessage: 'POSTGRES_CONNECTION_STRING_REQUIRED',
  invalidStaleSnapshotBatchSizeErrorCode: 'INVALID_STALE_SNAPSHOT_BATCH_SIZE',
});
