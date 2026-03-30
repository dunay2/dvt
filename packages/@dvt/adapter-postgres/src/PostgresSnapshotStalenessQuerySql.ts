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
    LEFT JOIN ${quoteIdentifier(schema)}.run_event_heads h
      ON h.run_id = m.run_id
      AND h.tenant_id = m.tenant_id
    WHERE (
      s.run_id IS NULL
      AND (
        COALESCE(h.latest_run_seq, 0) > 0
        OR EXISTS (
          SELECT 1
          FROM ${quoteIdentifier(schema)}.run_events e
          WHERE e.run_id = m.run_id
            AND e.tenant_id = m.tenant_id
          LIMIT 1
        )
      )
    )
    OR (
      s.run_id IS NOT NULL
      AND (
        s.last_run_seq < COALESCE(h.latest_run_seq, 0)
        OR (
          h.run_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM ${quoteIdentifier(schema)}.run_events e
            WHERE e.run_id = m.run_id
              AND e.tenant_id = m.tenant_id
              AND e.run_seq > COALESCE(s.last_run_seq, 0)
            LIMIT 1
          )
        )
      )
    )
    ORDER BY m.created_at ASC
    LIMIT $1
  `;
}
