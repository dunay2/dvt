/**
 * @file packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts
 *
 * PostgreSQL-backed lineage outbox and dead-letter storage.
 * Implements the ILineageOutboxStore contract: enqueue, deliver, retry,
 * and dead-letter operations for the DVT lineage publication pattern.
 *
 * G10 — outbox_lineage worker + fail-open DLQ
 */
import { MAX_LINEAGE_ATTEMPTS } from '@dvt/contracts';
import type {
  LineageFailureDisposition,
  ILineageOutboxStore,
  LineageDeadLetterRecord,
  LineageOutboxRecord,
} from '@dvt/contracts';
import type { PoolClient } from 'pg';

import {
  countPendingLineageOutboxSql,
  deleteLineageOutboxByIdSql,
  deleteLineageOutboxByIdsSql,
  insertLineageDeadLetterSql,
  insertLineageOutboxSql,
  listLineageDeadLetterSql,
  listPendingLineageOutboxForClaimSql,
  updateLineageOutboxFailureSql,
} from './PostgresLineageOutboxStoreSql.js';
import type { EventEnvelope } from './types.js';

// ---------------------------------------------------------------------------
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface LineageOutboxRow {
  id: string;
  tenant_id: string;
  run_id: string;
  event_type: string;
  payload: EventEnvelope;
  attempts: number;
  last_error: string | null;
  status: string;
  next_attempt_at: string | null;
  claimed_at: string | null;
  created_at: string;
}

interface LineageMarkFailedRow {
  id: string;
  tenant_id: string;
  run_id: string;
  event_type: string;
  payload: EventEnvelope;
  attempts: number;
}

interface LineageDeadLetterRow {
  id: string;
  original_id: string;
  tenant_id: string;
  run_id: string;
  event_type: string;
  payload: EventEnvelope;
  last_error: string;
  dead_lettered_at: string;
}

interface PendingLineageCountRow {
  pending_count: number;
}

// ---------------------------------------------------------------------------
// PostgresLineageOutboxStore
// ---------------------------------------------------------------------------

const DEFAULT_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_LINEAGE_QUERY_LIMIT = 1000;

export function normalizeLineageOutboxClaimTimeoutMs(value: number | undefined): number {
  const claimTimeoutMs = value ?? DEFAULT_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS;
  if (!Number.isInteger(claimTimeoutMs) || claimTimeoutMs <= 0) {
    throw new Error(`INVALID_LINEAGE_OUTBOX_CLAIM_TIMEOUT_MS: ${value}`);
  }
  return claimTimeoutMs;
}

function normalizeLineageQueryLimit(limit: number, fieldName: string): number {
  if (!Number.isInteger(limit) || !Number.isFinite(limit) || limit < 0) {
    throw new Error(`INVALID_${fieldName}: ${limit}`);
  }
  return Math.min(limit, MAX_LINEAGE_QUERY_LIMIT);
}

export class PostgresLineageOutboxStore implements ILineageOutboxStore {
  constructor(
    private readonly schema: string,
    private readonly now: () => string,
    private readonly lineageOutboxClaimTimeoutMs: number,
    private readonly withTransaction: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async enqueue(runId: string, payload: EventEnvelope): Promise<void> {
    const id = `lox-${payload.eventId}`;
    const now = this.now();
    await this.withClient((client) =>
      client.query(insertLineageOutboxSql(this.schema), [
        id,
        payload.tenantId,
        runId,
        payload.eventType,
        JSON.stringify(payload),
        now,
      ])
    );
  }

  async listPending(limit: number): Promise<LineageOutboxRecord[]> {
    const boundedLimit = normalizeLineageQueryLimit(limit, 'LINEAGE_PENDING_LIMIT');
    if (boundedLimit === 0) return [];

    return this.withTransaction(async (client) => {
      const now = this.now();
      const result = await client.query<LineageOutboxRow>(
        listPendingLineageOutboxForClaimSql(this.schema),
        [boundedLimit, now, this.lineageOutboxClaimTimeoutMs]
      );
      return result.rows.map(rowToRecord);
    });
  }

  async countPending(): Promise<number> {
    const now = this.now();
    const result = await this.withClient((client) =>
      client.query<PendingLineageCountRow>(countPendingLineageOutboxSql(this.schema), [
        now,
        this.lineageOutboxClaimTimeoutMs,
      ])
    );
    return Number(result.rows[0]?.pending_count ?? 0);
  }

  async markDelivered(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const now = this.now();
    await this.withClient((client) =>
      client.query(deleteLineageOutboxByIdsSql(this.schema), [
        ids,
        now,
        this.lineageOutboxClaimTimeoutMs,
      ])
    );
  }

  async markFailed(id: string, error: string): Promise<LineageFailureDisposition> {
    return this.withTransaction(async (client) => {
      const now = this.now();
      const result = await client.query<LineageMarkFailedRow>(
        updateLineageOutboxFailureSql(this.schema, MAX_LINEAGE_ATTEMPTS),
        [id, error, now, this.lineageOutboxClaimTimeoutMs]
      );

      const row = result.rows[0];
      if (!row) return 'not_found';
      if (row.attempts < MAX_LINEAGE_ATTEMPTS) return 'retry_scheduled';

      const deadLetterId = `ldl-${row.id}-${now}`;
      await client.query(insertLineageDeadLetterSql(this.schema), [
        deadLetterId,
        row.id,
        row.tenant_id,
        row.run_id,
        row.event_type,
        JSON.stringify(row.payload),
        error,
        now,
      ]);
      await client.query(deleteLineageOutboxByIdSql(this.schema), [row.id]);
      return 'dead_lettered';
    });
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<LineageDeadLetterRecord[]> {
    if (!tenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }
    const boundedLimit = normalizeLineageQueryLimit(limit, 'LINEAGE_DEAD_LETTER_LIMIT');
    if (boundedLimit === 0) return [];

    const result = await this.withClient((client) =>
      client.query<LineageDeadLetterRow>(listLineageDeadLetterSql(this.schema), [
        boundedLimit,
        tenantId,
      ])
    );
    return result.rows.map((row) => ({
      id: row.id,
      originalId: row.original_id,
      tenantId: row.tenant_id,
      runId: row.run_id,
      eventType: row.event_type,
      payload: row.payload,
      lastError: row.last_error,
      deadLetteredAt: row.dead_lettered_at,
    }));
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToRecord(row: LineageOutboxRow): LineageOutboxRecord {
  const record: LineageOutboxRecord = {
    id: row.id,
    tenantId: row.tenant_id,
    runId: row.run_id,
    eventType: row.event_type,
    payload: row.payload,
    attempts: row.attempts,
    createdAt: row.created_at,
  };

  if (row.last_error !== null) {
    record.lastError = row.last_error;
  }

  return record;
}
