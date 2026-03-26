/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Run event persistence extracted from PostgresStateStoreAdapter
 * @consequence Single-responsibility class for run_events table operations
 * @version 1.0.0
 * @date 2026-03-15
 */
import { parseRunEventWrite } from '@dvt/contracts';
import type { RunEventWriteSchemaT } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import {
  advisoryLockSql,
  insertEventSql,
  listEventsSql,
  maxRunSeqSql,
  selectExistingEventSql,
} from './PostgresRunEventStoreSql.js';
import { InvalidRunEventEnvelopeError, InvalidRunEventTenantError } from './runEventStoreErrors.js';
import type {
  RunEventAppendResult,
  RunEventReadRepository,
  RunEventWriteRepository,
  SqlCommandExecutor,
} from './RunEventWriteRepository.js';
import type { EventEnvelope, EventInput, ListEventsOptions, RunId } from './types.js';
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface EventPayloadRow {
  payload: EventEnvelope;
}

interface MaxSeqRow {
  max_seq: number | string;
}

// ---------------------------------------------------------------------------
// Result types (internal)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PostgresRunEventStore
// ---------------------------------------------------------------------------

export class PostgresRunEventStore implements RunEventWriteRepository, RunEventReadRepository {
  constructor(
    private readonly schema: string,
    private readonly now: () => string,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async append(
    executor: SqlCommandExecutor,
    tenantId: string,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<RunEventAppendResult> {
    await this.acquireRunLock(executor, runId);
    const baseRunSeq = await this.getMaxRunSeq(executor, runId);
    const { appended, deduped, lastAppendedRunSeq } = await this.insertAndDedupEvents(
      executor,
      tenantId,
      runId,
      envelopes,
      baseRunSeq
    );
    return { appended, deduped, lastAppendedRunSeq, baseRunSeq };
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]> {
    const params: unknown[] = [tenantId, runId];
    let afterSeqClause = '';
    let limitClause = '';

    if (options?.afterSeq !== undefined) {
      params.push(options.afterSeq);
      afterSeqClause = `AND run_seq > $${params.length}`;
    }
    if (options?.limit !== undefined) {
      params.push(Math.max(1, options.limit));
      limitClause = `LIMIT $${params.length}`;
    }

    const result = await this.withClient((client) =>
      client.query<EventPayloadRow>(listEventsSql(this.schema, afterSeqClause, limitClause), params)
    );

    return result.rows.map((row: EventPayloadRow) => row.payload);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async acquireRunLock(executor: SqlCommandExecutor, runId: RunId): Promise<void> {
    // Use 64-bit MD5-derived lock key to avoid hashtext()'s 32-bit collision space.
    // Birthday bound is now ~2^32 rather than ~2^16 concurrent distinct runIds.
    await executor.query(advisoryLockSql(), [runId]);
  }

  private async getMaxRunSeq(executor: SqlCommandExecutor, runId: RunId): Promise<number> {
    const seqResult = await executor.query<MaxSeqRow>(maxRunSeqSql(this.schema), [runId]);
    return Number(seqResult.rows[0]?.max_seq ?? 0);
  }

  private async insertAndDedupEvents(
    executor: SqlCommandExecutor,
    tenantId: string,
    runId: RunId,
    envelopes: EventInput[],
    baseRunSeq: number
  ): Promise<{
    appended: EventEnvelope[];
    deduped: EventEnvelope[];
    lastAppendedRunSeq: number | null;
  }> {
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];
    let lastAppendedRunSeq: number | null = null;
    let nextRunSeq = baseRunSeq + 1;

    for (const [index, envelope] of envelopes.entries()) {
      const validated = parseRunEventWrite(envelope);
      this.assertEnvelopeRunIdMatchesBatchRunId(validated, runId, index);
      this.assertEnvelopeTenantIdMatchesRunTenant(validated, runId, tenantId, index);
      const withSeq = this.enrichEnvelopeWithSeq(validated, nextRunSeq);
      const inserted = await this.processEnvelopeInsertion(executor, runId, withSeq, {
        appended,
        deduped,
        setLastAppendedRunSeq: (runSeq) => {
          lastAppendedRunSeq = runSeq;
        },
      });
      if (inserted) {
        nextRunSeq += 1;
      }
    }

    return { appended, deduped, lastAppendedRunSeq };
  }

  private async processEnvelopeInsertion(
    executor: SqlCommandExecutor,
    runId: RunId,
    withSeq: EventEnvelope,
    result: {
      appended: EventEnvelope[];
      deduped: EventEnvelope[];
      setLastAppendedRunSeq(runSeq: number): void;
    }
  ): Promise<boolean> {
    const inserted = await this.tryInsertEvent(executor, runId, withSeq);

    if (inserted) {
      result.appended.push(withSeq);
      result.setLastAppendedRunSeq(withSeq.runSeq);
      return true;
    }

    const existing = await this.getExistingEvent(executor, runId, withSeq.idempotencyKey);
    if (existing) {
      result.deduped.push(existing);
    }
    return false;
  }

  private assertEnvelopeRunIdMatchesBatchRunId(
    envelope: RunEventWriteSchemaT,
    runId: RunId,
    index: number
  ): void {
    if (envelope.runId !== runId) {
      throw new InvalidRunEventEnvelopeError(runId, index, envelope.runId);
    }
  }

  private assertEnvelopeTenantIdMatchesRunTenant(
    envelope: RunEventWriteSchemaT,
    runId: RunId,
    tenantId: string,
    index: number
  ): void {
    if (envelope.tenantId !== tenantId) {
      throw new InvalidRunEventTenantError(runId, index, tenantId, envelope.tenantId);
    }
  }

  private enrichEnvelopeWithSeq(envelope: RunEventWriteSchemaT, runSeq: number): EventEnvelope {
    return {
      ...envelope,
      runSeq,
      persistedAt: this.now(),
    } as EventEnvelope;
  }

  private async tryInsertEvent(
    executor: SqlCommandExecutor,
    runId: RunId,
    withSeq: EventEnvelope
  ): Promise<boolean> {
    const inserted = await executor.query<EventPayloadRow>(insertEventSql(this.schema), [
      runId,
      withSeq.runSeq,
      withSeq.eventType,
      withSeq.emittedAt,
      withSeq.tenantId,
      withSeq.projectId,
      withSeq.environmentId,
      withSeq.engineAttemptId,
      withSeq.logicalAttemptId,
      withSeq.planId,
      withSeq.planVersion,
      withSeq.persistedAt,
      'stepId' in withSeq ? withSeq.stepId : null,
      withSeq.idempotencyKey,
      JSON.stringify(withSeq),
    ]);
    return (inserted.rowCount ?? 0) > 0;
  }

  private async getExistingEvent(
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
}
