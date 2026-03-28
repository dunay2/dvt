/**
 * @file packages/@dvt/adapter-postgres/src/PostgresAdapterClientSessionConstants.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Centralize client-session protocol constants
 * @consequence Session lifecycle and error contracts avoid inline literals
 * @version 1.0.0
 * @date 2026-03-28
 */
export const POSTGRES_ADAPTER_CLIENT_SESSION_CONSTANTS = Object.freeze({
  pendingOperationsAbortedErrorMessage: 'PENDING_OPERATIONS_ABORTED',
  pendingOperationsAbortedErrorName: 'AbortError',
  maintenanceModeActiveErrorMessage: 'SESSION_MAINTENANCE_MODE_ACTIVE',
  maintenanceModeActiveErrorName: 'MaintenanceError',
  transactionRollbackFailedErrorMessage: 'TRANSACTION_ROLLBACK_FAILED',
  transactionRollbackFailedErrorName: 'PostgresTransactionError',
  statementTimeoutDisabledMs: 0,
  destroyClientOnAbort: true,
  releaseClientNormally: false,
});
