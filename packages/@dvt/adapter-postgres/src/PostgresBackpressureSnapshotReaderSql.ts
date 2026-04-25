/**
 * @file packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReaderSql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL text used by PostgresBackpressureSnapshotReader
 * @consequence Backpressure reader keeps orchestration logic separate from SQL details
 * @version 1.0.0
 * @date 2026-03-28
 */
import { quoteIdentifier } from './sqlUtils.js';

export function getBackpressureSnapshotSql(schema: string): string {
  return `
    WITH active_outbox AS (
      SELECT m.tenant_id, o.created_at
      FROM ${quoteIdentifier(schema)}.outbox o
      INNER JOIN ${quoteIdentifier(schema)}.run_metadata m
        ON m.run_id = o.run_id
       AND m.tenant_id = o.tenant_id
      WHERE o.delivered_at IS NULL
        AND o.created_at >= $3::timestamptz
    ),
    stuck_outbox AS (
      SELECT m.tenant_id
      FROM ${quoteIdentifier(schema)}.outbox o
      INNER JOIN ${quoteIdentifier(schema)}.run_metadata m
        ON m.run_id = o.run_id
       AND m.tenant_id = o.tenant_id
      WHERE o.delivered_at IS NULL
        AND o.created_at < $3::timestamptz
    ),
    tenant_counts AS (
      SELECT
        tenant_id,
        COUNT(*)::integer AS active_pending_count,
        MIN(created_at) AS oldest_created_at
      FROM active_outbox
      GROUP BY tenant_id
    )
    SELECT
      COALESCE(
        (SELECT active_pending_count FROM tenant_counts WHERE tenant_id = $1),
        0
      )::integer AS tenant_active_pending_event_count,
      COALESCE(
        (SELECT COUNT(*) FROM stuck_outbox WHERE tenant_id = $1),
        0
      )::integer AS tenant_stuck_pending_event_count,
      COALESCE((SELECT COUNT(*) FROM active_outbox), 0)::integer AS global_active_pending_event_count,
      COALESCE(
        (
          SELECT FLOOR(EXTRACT(EPOCH FROM (($2::timestamptz) - MIN(oldest_created_at))) * 1000)
          FROM tenant_counts
          WHERE active_pending_count <= $4
        ),
        0
      )::bigint AS global_healthy_tenant_oldest_active_age_ms
  `;
}
