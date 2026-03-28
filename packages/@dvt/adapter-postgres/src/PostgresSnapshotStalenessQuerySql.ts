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
    WITH latest_events AS (
      SELECT e.run_id, MAX(e.run_seq) AS max_run_seq
      FROM ${quoteIdentifier(schema)}.run_events e
      GROUP BY e.run_id
    )
    SELECT m.run_id, m.tenant_id
    FROM ${quoteIdentifier(schema)}.run_metadata m
    LEFT JOIN ${quoteIdentifier(schema)}.run_snapshots s ON s.run_id = m.run_id
    LEFT JOIN latest_events le ON le.run_id = m.run_id
    WHERE s.run_id IS NULL
      OR s.last_run_seq < COALESCE(le.max_run_seq, 0)
    ORDER BY m.created_at ASC
    LIMIT $1
  `;
}
