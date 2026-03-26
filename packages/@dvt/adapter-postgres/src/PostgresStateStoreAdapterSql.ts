/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapterSql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL text used by PostgresStateStoreAdapter
 * @consequence Adapter orchestration remains free of inline SQL blocks
 * @version 1.0.0
 * @date 2026-03-26
 */
import { quoteIdentifier } from './sqlUtils.js';

export function listStaleSnapshotRunsSql(schema: string): string {
  return `SELECT m.run_id, m.tenant_id
     FROM ${quoteIdentifier(schema)}.run_metadata m
     LEFT JOIN ${quoteIdentifier(schema)}.run_snapshots s ON s.run_id = m.run_id
    WHERE s.run_id IS NULL
       OR s.last_run_seq < (
            SELECT MAX(e.run_seq)
              FROM ${quoteIdentifier(schema)}.run_events e
             WHERE e.run_id = m.run_id
          )
    ORDER BY m.created_at ASC
    LIMIT $1`;
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
