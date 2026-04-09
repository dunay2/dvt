/**
 * @file packages/@dvt/adapter-postgres/src/PostgresSnapshotStalenessQuerySql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL text used by PostgresSnapshotStalenessQuery
 * @consequence Snapshot staleness query stays isolated from query execution logic
 * @version 1.0.0
 * @date 2026-03-28
 */
import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION } from '@dvt/contracts';

import { quoteIdentifier } from './sqlUtils.js';

export const IS_SNAPSHOT_STALE_ALIAS = 'is_snapshot_stale' as const;

export function listStaleSnapshotRunsSql(schema: string): string {
  const snapshotSchemaVersion = String(CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION);
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
        COALESCE(s.snapshot->>'schemaVersion', '') <> '${snapshotSchemaVersion}'
        OR
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

/**
 * Per-run staleness check for the API read path (GET /runs/:runId).
 *
 * Uses a LATERAL join directly against run_events instead of run_event_heads
 * because run_id + tenant_id are already known: the planner uses the
 * (run_id, tenant_id, run_seq DESC) index with LIMIT 1, so the cost is a
 * single index seek regardless of run_event_heads availability.
 *
 * listStaleSnapshotRunsSql uses run_event_heads because it must discover
 * stale runs across the entire run_metadata table (projector worker use case)
 * — without the heads cache that would require a run_events scan per row.
 */
export function isSnapshotStaleSql(schema: string): string {
  const snapshotSchemaVersion = String(CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION);
  return `
    SELECT EXISTS (
      SELECT 1
      FROM ${quoteIdentifier(schema)}.run_metadata m
      LEFT JOIN ${quoteIdentifier(schema)}.run_snapshots s ON s.run_id = m.run_id
      LEFT JOIN LATERAL (
        SELECT e.run_seq
        FROM ${quoteIdentifier(schema)}.run_events e
        WHERE e.run_id = m.run_id
          AND e.tenant_id = m.tenant_id
        ORDER BY e.run_seq DESC
        LIMIT 1
      ) le ON TRUE
      WHERE m.tenant_id = $1
        AND m.run_id = $2
        AND (
          (s.run_id IS NULL AND le.run_seq IS NOT NULL)
          OR COALESCE(s.snapshot->>'schemaVersion', '') <> '${snapshotSchemaVersion}'
          OR s.last_run_seq < COALESCE(le.run_seq, 0)
        )
    ) AS ${IS_SNAPSHOT_STALE_ALIAS}
  `;
}
