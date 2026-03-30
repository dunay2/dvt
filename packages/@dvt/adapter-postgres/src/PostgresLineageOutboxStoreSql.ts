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
      WHERE (
        (
          o.status = 'pending'
          AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= $2::timestamptz)
          AND (
            o.claimed_at IS NULL
            OR o.claimed_at < ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))
          )
        )
        OR (
          o.status = 'claimed'
          AND o.claimed_at IS NOT NULL
          AND o.claimed_at < ($2::timestamptz - ($3::bigint * INTERVAL '1 millisecond'))
        )
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
    WHERE (
      (
        o.status = 'pending'
        AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= $1::timestamptz)
        AND (
          o.claimed_at IS NULL
          OR o.claimed_at < ($1::timestamptz - ($2::bigint * INTERVAL '1 millisecond'))
        )
      )
      OR (
        o.status = 'claimed'
        AND o.claimed_at IS NOT NULL
        AND o.claimed_at < ($1::timestamptz - ($2::bigint * INTERVAL '1 millisecond'))
      )
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

export function countLineageDeadLetterSql(schema: string): string {
  return `
    SELECT COUNT(*)::int AS dead_letter_count
    FROM ${quoteIdentifier(schema)}.lineage_dead_letter
    WHERE tenant_id = $1
  `;
}

export function replayLineageDeadLetterSql(
  schema: string,
  whereClause: string,
  replayedAtParam: string
): string {
  return `
    WITH picked AS (
      SELECT dl.id, dl.original_id, dl.tenant_id, dl.run_id, dl.event_type, dl.payload
      FROM ${quoteIdentifier(schema)}.lineage_dead_letter dl
      ${whereClause}
      ORDER BY dl.dead_lettered_at ASC
      LIMIT $2
      FOR UPDATE SKIP LOCKED
    ), upserted AS (
      INSERT INTO ${quoteIdentifier(schema)}.lineage_outbox (
        id,
        tenant_id,
        run_id,
        event_type,
        payload,
        attempts,
        last_error,
        status,
        created_at,
        next_attempt_at,
        claimed_at
      )
      SELECT
        picked.original_id,
        picked.tenant_id,
        picked.run_id,
        picked.event_type,
        picked.payload,
        0,
        NULL,
        'pending',
        ${replayedAtParam}::timestamptz,
        NULL,
        NULL
      FROM picked
      ON CONFLICT (id) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id,
          run_id = EXCLUDED.run_id,
          event_type = EXCLUDED.event_type,
          payload = EXCLUDED.payload,
          attempts = 0,
          last_error = NULL,
          status = 'pending',
          created_at = EXCLUDED.created_at,
          next_attempt_at = NULL,
          claimed_at = NULL
    ), deleted AS (
      DELETE FROM ${quoteIdentifier(schema)}.lineage_dead_letter dl
      USING picked
      WHERE dl.id = picked.id
      RETURNING dl.id
    )
    SELECT COUNT(*)::int AS moved_count
    FROM deleted
  `;
}
