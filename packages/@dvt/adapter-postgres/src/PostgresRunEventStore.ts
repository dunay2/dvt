/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Run event persistence extracted from PostgresStateStoreAdapter
 * @consequence Single-responsibility class for run_events table operations
 * @version 1.0.0
 * @date 2026-03-15
 */
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';
import type { EventEnvelope, EventInput, ListEventsOptions, RunId } from './types.js';

// ---------------------------------------------------------------------------
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

interface AppendWithClientResult {
  appended: EventEnvelope[];
  deduped: EventEnvelope[];
  lastAppendedRunSeq: number | null;
  baseRunSeq: number;
}

// ---------------------------------------------------------------------------
// PostgresRunEventStore
// ---------------------------------------------------------------------------

export class PostgresRunEventStore {
  constructor(
    private readonly schema: string,
    private readonly now: () => string,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async appendWithClient(
    client: PoolClient,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendWithClientResult> {
    await this.acquireRunLock(client, runId);
    const baseRunSeq = await this.getMaxRunSeq(client, runId);
    const { appended, deduped, lastAppendedRunSeq } = await this.insertAndDedupEvents(
      client,
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
      client.query<EventPayloadRow>(
        `
          SELECT payload
          FROM ${quoteIdentifier(this.schema)}.run_events
          WHERE tenant_id = $1 AND run_id = $2
          ${afterSeqClause}
          ORDER BY run_seq ASC
          ${limitClause}
        `,
        params
      )
    );

    return result.rows.map((row: EventPayloadRow) => row.payload);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async acquireRunLock(client: PoolClient, runId: RunId): Promise<void> {
    // Use 64-bit MD5-derived lock key to avoid hashtext()'s 32-bit collision space.
    // Birthday bound is now ~2^32 rather than ~2^16 concurrent distinct runIds.
    await client.query(
      `SELECT pg_advisory_xact_lock(('x' || left(md5($1), 16))::bit(64)::bigint)`,
      [runId]
    );
  }

  private async getMaxRunSeq(client: PoolClient, runId: RunId): Promise<number> {
    const seqResult = await client.query<MaxSeqRow>(
      `SELECT COALESCE(MAX(run_seq), 0) AS max_seq FROM ${quoteIdentifier(this.schema)}.run_events WHERE run_id = $1`,
      [runId]
    );
    return Number(seqResult.rows[0]?.max_seq ?? 0);
  }

  private async insertAndDedupEvents(
    client: PoolClient,
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

    for (const envelope of envelopes) {
      const withSeq = this.enrichEnvelopeWithSeq(envelope, nextRunSeq);
      await this.processEnvelopeInsertion(client, runId, withSeq, {
        appended,
        deduped,
        setLastAppendedRunSeq: (runSeq) => {
          lastAppendedRunSeq = runSeq;
        },
      });
      nextRunSeq += 1;
    }

    return { appended, deduped, lastAppendedRunSeq };
  }

  private async processEnvelopeInsertion(
    client: PoolClient,
    runId: RunId,
    withSeq: EventEnvelope,
    result: {
      appended: EventEnvelope[];
      deduped: EventEnvelope[];
      setLastAppendedRunSeq(runSeq: number): void;
    }
  ): Promise<void> {
    const inserted = await this.tryInsertEvent(client, runId, withSeq);

    if (inserted) {
      result.appended.push(withSeq);
      result.setLastAppendedRunSeq(withSeq.runSeq);
      return;
    }

    const existing = await this.getExistingEvent(client, runId, withSeq.idempotencyKey);
    if (existing) {
      result.deduped.push(existing);
    }
  }

  private enrichEnvelopeWithSeq(envelope: EventInput, runSeq: number): EventEnvelope {
    return {
      ...envelope,
      runSeq,
      persistedAt: this.now(),
    } as EventEnvelope;
  }

  private async tryInsertEvent(
    client: PoolClient,
    runId: RunId,
    withSeq: EventEnvelope
  ): Promise<boolean> {
    const inserted = await client.query<EventPayloadRow>(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.run_events (
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
      `,
      [
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
      ]
    );
    return (inserted.rowCount ?? 0) > 0;
  }

  private async getExistingEvent(
    client: PoolClient,
    runId: RunId,
    idempotencyKey: string
  ): Promise<EventEnvelope | null> {
    const result = await client.query<EventPayloadRow>(
      `
        SELECT payload
        FROM ${quoteIdentifier(this.schema)}.run_events
        WHERE run_id = $1 AND idempotency_key = $2
        LIMIT 1
      `,
      [runId, idempotencyKey]
    );
    return result.rows[0]?.payload ?? null;
  }
}
