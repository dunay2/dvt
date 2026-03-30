/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunEventStoreSql.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Centralize SQL text for PostgresRunEventStore in a dedicated module
 * @consequence Store class focuses on policy/orchestration instead of inline query literals
 * @version 1.0.0
 * @date 2026-03-26
 */
import { quoteIdentifier } from './sqlUtils.js';

export function advisoryLockSql(): string {
  return `SELECT pg_advisory_xact_lock(('x' || left(md5($1), 16))::bit(64)::bigint)`;
}

export function maxRunSeqSql(schema: string): string {
  return `SELECT COALESCE(MAX(run_seq), 0) AS max_seq FROM ${quoteIdentifier(schema)}.run_events WHERE run_id = $1`;
}

export function listEventsSql(schema: string, afterSeqClause: string, limitClause: string): string {
  return `
    SELECT payload
    FROM ${quoteIdentifier(schema)}.run_events
    WHERE tenant_id = $1 AND run_id = $2
    ${afterSeqClause}
    ORDER BY run_seq ASC
    ${limitClause}
  `;
}

export function insertEventSql(schema: string): string {
  return `
    INSERT INTO ${quoteIdentifier(schema)}.run_events (
      run_id,
      run_seq,
      event_type,
      emitted_at,
      tenant_id,
      project_id,
      environment_id,
      engine_attempt_id,
      logical_attempt_id,
      plan_id,
      plan_version,
      persisted_at,
      step_id,
      idempotency_key,
      payload
    )
    VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13, $14, $15::jsonb)
    ON CONFLICT (run_id, idempotency_key) DO NOTHING
    RETURNING payload
  `;
}

export function upsertRunEventHeadSql(schema: string): string {
  return `
    INSERT INTO ${quoteIdentifier(schema)}.run_event_heads (
      run_id,
      tenant_id,
      latest_run_seq,
      updated_at
    )
    VALUES ($1, $2, $3, $4::timestamptz)
    ON CONFLICT (run_id, tenant_id)
    DO UPDATE
    SET latest_run_seq = GREATEST(
      ${quoteIdentifier(schema)}.run_event_heads.latest_run_seq,
      EXCLUDED.latest_run_seq
    ),
        updated_at = EXCLUDED.updated_at
  `;
}

export function upsertSnapshotWorkItemSql(schema: string): string {
  return `
    INSERT INTO ${quoteIdentifier(schema)}.snapshot_work_queue (
      run_id,
      tenant_id,
      latest_run_seq,
      enqueued_at
    )
    VALUES ($1, $2, $3, $4::timestamptz)
    ON CONFLICT (run_id, tenant_id)
    DO UPDATE
    SET latest_run_seq = GREATEST(
      ${quoteIdentifier(schema)}.snapshot_work_queue.latest_run_seq,
      EXCLUDED.latest_run_seq
    ),
        enqueued_at = LEAST(
          ${quoteIdentifier(schema)}.snapshot_work_queue.enqueued_at,
          EXCLUDED.enqueued_at
        )
  `;
}

export function selectExistingEventSql(schema: string): string {
  return `
    SELECT payload
    FROM ${quoteIdentifier(schema)}.run_events
    WHERE run_id = $1 AND idempotency_key = $2
    LIMIT 1
  `;
}
