/**
 * @file packages/@dvt/adapter-postgres/src/PostgresLineageOutboxStore.ts
 *
 * PostgreSQL-backed lineage outbox and dead-letter storage.
 * Implements the ILineageOutboxStore contract: enqueue, deliver, retry,
 * and dead-letter operations for the DVT lineage publication pattern.
 *
 * G10 — outbox_lineage worker + fail-open DLQ
 */
import { MAX_LINEAGE_ATTEMPTS } from '@dvt/traceability-service';
import type {
  LineageFailureDisposition,
  ILineageOutboxStore,
  LineageDeadLetterRecord,
  LineageOutboxRecord,
} from '@dvt/traceability-service';
import type { PoolClient } from 'pg';

import {
  normalizeLineageQueryLimit,
  normalizeLineageTenantScope,
} from './lineageOutboxStorePolicy.js';
import {
  countLineageDeadLetterSql,
  countPendingLineageOutboxSql,
  deleteLineageOutboxByIdSql,
  deleteLineageOutboxByIdsSql,
  insertLineageDeadLetterSql,
  insertLineageOutboxSql,
  listLineageDeadLetterSql,
  listPendingLineageOutboxForClaimSql,
  replayLineageDeadLetterSql,
  updateLineageOutboxFailureSql,
} from './PostgresLineageOutboxStoreSql.js';
import { PostgresSchemaManager } from './PostgresSchemaManager.js';
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

interface LineageDeadLetterCountRow {
  dead_letter_count: number;
}

interface ReplayLineageDeadLetterRow {
  moved_count: number;
}

// ---------------------------------------------------------------------------
// PostgresLineageOutboxStore
// ---------------------------------------------------------------------------

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
    await this.withClient(async (client) => {
      await PostgresSchemaManager.setServiceContext(client);
      await client.query(insertLineageOutboxSql(this.schema), [
        id,
        payload.tenantId,
        runId,
        payload.eventType,
        JSON.stringify(payload),
        now,
      ]);
    });
  }

  async listPending(limit: number): Promise<LineageOutboxRecord[]> {
    const boundedLimit = normalizeLineageQueryLimit(limit, 'LINEAGE_PENDING_LIMIT');
    if (boundedLimit === 0) return [];

    return this.withTransaction(async (client) => {
      await PostgresSchemaManager.setServiceContext(client);
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
    const result = await this.withClient(async (client) => {
      await PostgresSchemaManager.setServiceContext(client);
      return client.query<PendingLineageCountRow>(countPendingLineageOutboxSql(this.schema), [
        now,
        this.lineageOutboxClaimTimeoutMs,
      ]);
    });
    return Number(result.rows[0]?.pending_count ?? 0);
  }

  async markDelivered(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const now = this.now();
    await this.withClient(async (client) => {
      await PostgresSchemaManager.setServiceContext(client);
      await client.query(deleteLineageOutboxByIdsSql(this.schema), [
        ids,
        now,
        this.lineageOutboxClaimTimeoutMs,
      ]);
    });
  }

  async markFailed(id: string, error: string): Promise<LineageFailureDisposition> {
    return this.withTransaction(async (client) => {
      await PostgresSchemaManager.setServiceContext(client);
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
    const normalizedTenantId = normalizeLineageTenantScope(tenantId);
    if (!normalizedTenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }
    const boundedLimit = normalizeLineageQueryLimit(limit, 'LINEAGE_DEAD_LETTER_LIMIT');
    if (boundedLimit === 0) return [];

    const result = await this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, normalizedTenantId);
      return client.query<LineageDeadLetterRow>(listLineageDeadLetterSql(this.schema), [
        boundedLimit,
        normalizedTenantId,
      ]);
    });
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

  async countDeadLetter(tenantId: string): Promise<number> {
    const normalizedTenantId = normalizeLineageTenantScope(tenantId);
    if (!normalizedTenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }

    const result = await this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, normalizedTenantId);
      return client.query<LineageDeadLetterCountRow>(countLineageDeadLetterSql(this.schema), [
        normalizedTenantId,
      ]);
    });
    return Number(result.rows[0]?.dead_letter_count ?? 0);
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit: number;
    runId?: string;
    eventType?: string;
  }): Promise<number> {
    const tenantId = normalizeLineageTenantScope(options.tenantId);
    if (!tenantId) {
      throw new Error('TENANT_SCOPE_REQUIRED');
    }
    const boundedLimit = normalizeLineageQueryLimit(
      options.limit,
      'LINEAGE_DEAD_LETTER_REPLAY_LIMIT'
    );
    if (boundedLimit === 0) return 0;

    const params: unknown[] = [tenantId, boundedLimit];
    const where: string[] = ['WHERE dl.tenant_id = $1'];
    if (options.runId !== undefined) {
      const runId = options.runId.trim();
      if (!runId) {
        throw new Error('RUN_ID_SCOPE_REQUIRED');
      }
      params.push(runId);
      where.push(`AND dl.run_id = $${params.length}`);
    }
    if (options.eventType !== undefined) {
      const eventType = options.eventType.trim();
      if (!eventType) {
        throw new Error('EVENT_TYPE_SCOPE_REQUIRED');
      }
      params.push(eventType);
      where.push(`AND dl.event_type = $${params.length}`);
    }
    const replayedAt = this.now();
    params.push(replayedAt);
    const replayedAtParam = `$${params.length}`;

    const result = await this.withTransaction(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);
      return client.query<ReplayLineageDeadLetterRow>(
        replayLineageDeadLetterSql(this.schema, where.join('\n      '), replayedAtParam),
        params
      );
    });
    return Number(result.rows[0]?.moved_count ?? 0);
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
