import type { PoolClient } from 'pg';

import {
  advisoryLockSql,
  insertEventSql,
  listEventsSql,
  maxRunSeqSql,
  selectExistingEventSql,
} from './PostgresRunEventStoreSql.js';
import { InvalidRunSequenceValueError } from './runEventStoreErrors.js';
import type { SqlCommandExecutor } from './RunEventWriteRepository.js';
import type { EventEnvelope, RunId } from './types.js';

interface EventPayloadRow {
  payload: EventEnvelope;
}

interface MaxSeqRow {
  max_seq: unknown;
}

export interface ListPersistedEventsOptions {
  afterSeq?: number;
  limit?: number;
}

export class PostgresRunEventStorage {
  constructor(
    private readonly schema: string,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async acquireRunLock(executor: SqlCommandExecutor, runId: RunId): Promise<void> {
    // Use 64-bit MD5-derived lock key to avoid hashtext()'s 32-bit collision space.
    // Birthday bound is now ~2^32 rather than ~2^16 concurrent distinct runIds.
    await executor.query(advisoryLockSql(), [runId]);
  }

  async readMaxRunSeq(executor: SqlCommandExecutor, runId: RunId): Promise<number> {
    const seqResult = await executor.query<MaxSeqRow>(maxRunSeqSql(this.schema), [runId]);
    const rawMaxRunSeq = seqResult.rows[0]?.max_seq ?? 0;
    return parsePersistedRunSequence(rawMaxRunSeq, runId);
  }

  async insertEvent(
    executor: SqlCommandExecutor,
    runId: RunId,
    envelope: EventEnvelope
  ): Promise<boolean> {
    const inserted = await executor.query<EventPayloadRow>(insertEventSql(this.schema), [
      runId,
      envelope.runSeq,
      envelope.eventType,
      envelope.emittedAt,
      envelope.tenantId,
      envelope.projectId,
      envelope.environmentId,
      envelope.engineAttemptId,
      envelope.logicalAttemptId,
      envelope.planId,
      envelope.planVersion,
      envelope.persistedAt,
      'stepId' in envelope ? envelope.stepId : null,
      envelope.idempotencyKey,
      JSON.stringify(envelope),
    ]);
    return (inserted.rowCount ?? 0) > 0;
  }

  async selectExistingEvent(
    executor: SqlCommandExecutor,
    runId: RunId,
    idempotencyKey: string
  ): Promise<EventEnvelope | null> {
    const result = await executor.query<EventPayloadRow>(selectExistingEventSql(this.schema), [
      runId,
      idempotencyKey,
    ]);
    return result.rows[0]?.payload ?? null;
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options: ListPersistedEventsOptions
  ): Promise<EventEnvelope[]> {
    const params: unknown[] = [tenantId, runId];
    let afterSeqClause = '';
    let limitClause = '';

    if (options.afterSeq !== undefined) {
      params.push(options.afterSeq);
      afterSeqClause = `AND run_seq > $${params.length}`;
    }

    if (options.limit !== undefined) {
      params.push(options.limit);
      limitClause = `LIMIT $${params.length}`;
    }

    const result = await this.withClient((client) =>
      client.query<EventPayloadRow>(listEventsSql(this.schema, afterSeqClause, limitClause), params)
    );
    return result.rows.map((row: EventPayloadRow) => row.payload);
  }
}

const MAX_SAFE_RUN_SEQUENCE = BigInt(Number.MAX_SAFE_INTEGER);

function parsePersistedRunSequence(rawValue: unknown, runId: RunId): number {
  if (typeof rawValue === 'number') {
    if (!Number.isInteger(rawValue) || rawValue < 0 || rawValue > Number.MAX_SAFE_INTEGER) {
      throw new InvalidRunSequenceValueError(runId, rawValue);
    }
    return rawValue;
  }

  if (typeof rawValue === 'bigint') {
    return parsePersistedBigIntRunSequence(rawValue, runId);
  }

  if (typeof rawValue === 'string') {
    const normalized = rawValue.trim();
    if (normalized.length === 0) {
      throw new InvalidRunSequenceValueError(runId, rawValue);
    }
    try {
      return parsePersistedBigIntRunSequence(BigInt(normalized), runId);
    } catch {
      throw new InvalidRunSequenceValueError(runId, rawValue);
    }
  }

  throw new InvalidRunSequenceValueError(runId, rawValue);
}

function parsePersistedBigIntRunSequence(value: bigint, runId: RunId): number {
  if (value < 0n || value > MAX_SAFE_RUN_SEQUENCE) {
    throw new InvalidRunSequenceValueError(runId, value.toString());
  }
  return Number(value);
}
