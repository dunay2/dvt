/**
 * @file packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStoreSql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL text used by PostgresLineageOutboxStore
 * @consequence Store class focuses on lineage retry orchestration and policy decisions
 * @version 1.0.0
 * @date 2026-03-28
 */
import { quoteIdentifier } from './sqlUtils.js';

export function insertLineageOutboxSql(schema: string): string {
  return `
    INSERT INTO ${quoteIdentifier(schema)}.lineage_outbox
      (id, tenant_id, run_id, event_type, payload, attempts, status, created_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, 0, 'pending', $6::timestamptz)
    ON CONFLICT (id) DO NOTHING
  `;
}

export function listPendingLineageOutboxForClaimSql(schema: string): string {
  return `
    WITH picked AS (
      SELECT o.id
      FROM ${quoteIdentifier(schema)}.lineage_outbox o
      WHERE o.status = 'pending'
        AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= $2::timestamptz)
        AND (
          o.claimed_at IS NULL
          OR o.claimed_at < ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))
        )
      ORDER BY o.next_attempt_at ASC NULLS FIRST, o.created_at ASC, o.id ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE ${quoteIdentifier(schema)}.lineage_outbox o
      SET claimed_at = $2::timestamptz,
          status = 'claimed'
      FROM picked
      WHERE o.id = picked.id
      RETURNING o.id, o.tenant_id, o.run_id, o.event_type, o.payload, o.attempts, o.last_error, o.status, o.next_attempt_at, o.claimed_at, o.created_at
    )
    SELECT *
    FROM claimed
    ORDER BY next_attempt_at ASC NULLS FIRST, created_at ASC, id ASC
  `;
}

export function countPendingLineageOutboxSql(schema: string): string {
  return `
    SELECT COUNT(*)::int AS pending_count
    FROM ${quoteIdentifier(schema)}.lineage_outbox o
    WHERE o.status = 'pending'
      AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= $1::timestamptz)
      AND (
        o.claimed_at IS NULL
        OR o.claimed_at < ($1::timestamptz - ($2::bigint * INTERVAL '1 millisecond'))
      )
  `;
}

export function deleteLineageOutboxByIdsSql(schema: string): string {
  return `
    DELETE FROM ${quoteIdentifier(schema)}.lineage_outbox
    WHERE id = ANY($1::text[])
      AND status = 'claimed'
      AND claimed_at IS NOT NULL
      AND claimed_at >= ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))
  `;
}

export function updateLineageOutboxFailureSql(schema: string, maxLineageAttempts: number): string {
  return `
    UPDATE ${quoteIdentifier(schema)}.lineage_outbox
    SET attempts = attempts + 1,
        last_error = $2,
        status = CASE
          WHEN attempts + 1 >= ${maxLineageAttempts} THEN 'dead_lettered'
          ELSE 'pending'
        END,
        next_attempt_at = CASE
          WHEN attempts + 1 >= ${maxLineageAttempts} THEN NULL
          ELSE $3::timestamptz + make_interval(secs => LEAST(60, POWER(2, GREATEST(0, attempts))))
        END,
        claimed_at = NULL
    WHERE id = $1
      AND status = 'claimed'
      AND claimed_at IS NOT NULL
      AND claimed_at >= ($3::timestamptz - ($4::bigint * INTERVAL '1 millisecond'))
    RETURNING id, tenant_id, run_id, event_type, payload, attempts
  `;
}

export function deleteLineageOutboxByIdSql(schema: string): string {
  return `
    DELETE FROM ${quoteIdentifier(schema)}.lineage_outbox
    WHERE id = $1
  `;
}

export function insertLineageDeadLetterSql(schema: string): string {
  return `
    INSERT INTO ${quoteIdentifier(schema)}.lineage_dead_letter
      (id, original_id, tenant_id, run_id, event_type, payload, last_error, dead_lettered_at)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::timestamptz)
  `;
}

export function listLineageDeadLetterSql(schema: string): string {
  return `
    SELECT id, original_id, tenant_id, run_id, event_type, payload, last_error, dead_lettered_at
    FROM ${quoteIdentifier(schema)}.lineage_dead_letter
    WHERE tenant_id = $2
    ORDER BY dead_lettered_at DESC
    LIMIT $1
  `;
}
