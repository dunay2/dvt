/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinatorConstants.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Isolate coordinator literals and protocol constants from orchestration logic
 * @consequence PostgresRunStateCoordinator stays focused on transactional flow and invariant checks
 * @version 1.0.0
 * @date 2026-03-28
 */
export const POSTGRES_RUN_STATE_COORDINATOR_CONSTANTS = Object.freeze({
  pgUniqueViolationCode: '23505',
  tenantScopeRequiredErrorMessage: 'TENANT_SCOPE_REQUIRED',
  runMetadataTableName: 'run_metadata',
  runMetadataConstraintPrefix: 'run_metadata_',
});
