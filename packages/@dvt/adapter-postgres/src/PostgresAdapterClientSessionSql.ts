/**
 * @file packages/@dvt/adapter-postgres/src/PostgresAdapterClientSessionSql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL fragments used by PostgresAdapterClientSession
 * @consequence Client-session orchestration remains free of inline SQL strings
 * @version 1.0.0
 * @date 2026-03-28
 */

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
