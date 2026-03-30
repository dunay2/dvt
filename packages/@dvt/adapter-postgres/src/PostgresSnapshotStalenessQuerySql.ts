/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL text used by PostgresSnapshotStalenessQuery
 * @consequence Snapshot staleness query stays isolated from query execution logic
 * @version 1.0.0
 * @date 2026-03-28
 */
import { quoteIdentifier } from './sqlUtils.js';

export function listStaleSnapshotRunsSql(schema: string): string {
  return `
    SELECT m.run_id, m.tenant_id
    FROM ${quoteIdentifier(schema)}.run_metadata m
    LEFT JOIN ${quoteIdentifier(schema)}.run_snapshots s ON s.run_id = m.run_id
    LEFT JOIN LATERAL (
      SELECT e.run_seq AS max_run_seq
      FROM ${quoteIdentifier(schema)}.run_events e
      WHERE e.run_id = m.run_id
        AND e.tenant_id = m.tenant_id
      ORDER BY e.run_seq DESC
      LIMIT 1
    ) le ON TRUE
    WHERE s.run_id IS NULL
      OR s.last_run_seq < COALESCE(le.max_run_seq, 0)
    ORDER BY m.created_at ASC
    LIMIT $1
  `;
}

export function isSnapshotStaleSql(schema: string): string {
  return `
    SELECT EXISTS (
      SELECT 1
      FROM ${quoteIdentifier(schema)}.run_metadata m
      LEFT JOIN ${quoteIdentifier(schema)}.run_snapshots s ON s.run_id = m.run_id
      LEFT JOIN LATERAL (
        SELECT e.run_seq AS max_run_seq
        FROM ${quoteIdentifier(schema)}.run_events e
        WHERE e.run_id = m.run_id
          AND e.tenant_id = m.tenant_id
        ORDER BY e.run_seq DESC
        LIMIT 1
      ) le ON TRUE
      WHERE m.tenant_id = $1
        AND m.run_id = $2
        AND (
          s.run_id IS NULL
          OR s.last_run_seq < COALESCE(le.max_run_seq, 0)
        )
    ) AS is_stale
  `;
}
