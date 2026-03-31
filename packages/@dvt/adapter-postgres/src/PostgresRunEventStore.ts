/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunEventStore.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Run-event append orchestration is separated from low-level SQL storage concerns
 * @consequence Store policy remains focused on sequencing/deduplication while SQL operations live in dedicated storage module
 * @version 1.0.0
 * @date 2026-03-26
 */
import type { PoolClient } from 'pg';

import { PostgresRunEventStorage, type RunEventStoragePort } from './PostgresRunEventStorage.js';
import { validateAndEnrichEnvelope } from './runEventEnvelopePolicy.js';
import { InvalidListEventsLimitError } from './runEventStoreErrors.js';
import type {
  RunEventAppendResult,
  RunEventReadRepository,
  RunEventWriteRepository,
  SqlCommandExecutor,
} from './RunEventWriteRepository.js';
import type { EventEnvelope, EventInput, ListEventsOptions, RunId } from './types.js';

// ---------------------------------------------------------------------------
// PostgresRunEventStore
// ---------------------------------------------------------------------------

export class PostgresRunEventStore implements RunEventWriteRepository, RunEventReadRepository {
  private readonly storage: RunEventStoragePort;

  constructor(
    schema: string,
    private readonly now: () => string,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    storage?: RunEventStoragePort
  ) {
    this.storage = storage ?? new PostgresRunEventStorage(schema, this.withClient);
  }

  async append(
    executor: SqlCommandExecutor,
    tenantId: string,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<RunEventAppendResult> {
    await this.storage.acquireRunLock(executor, runId);
    const baseRunSeq = await this.storage.readMaxRunSeq(executor, runId);
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
    const limit = this.resolveListLimit(runId, options?.limit);
    return this.storage.listEvents(tenantId, runId, {
      ...(options?.afterSeq === undefined ? {} : { afterSeq: options.afterSeq }),
      ...(limit === undefined ? {} : { limit }),
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

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
      const withSeq = validateAndEnrichEnvelope(envelope, {
        runId,
        tenantId,
        index,
        runSeq: nextRunSeq,
        persistedAt: this.now(),
      });
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
    const inserted = await this.storage.insertEvent(executor, runId, withSeq);

    if (inserted) {
      await this.storage.upsertRunEventHead(
        executor,
        runId,
        withSeq.tenantId,
        withSeq.runSeq,
        withSeq.persistedAt
      );
      await this.storage.upsertSnapshotWorkItem(
        executor,
        runId,
        withSeq.tenantId,
        withSeq.runSeq,
        withSeq.persistedAt
      );
      result.appended.push(withSeq);
      result.setLastAppendedRunSeq(withSeq.runSeq);
      return true;
    }

    const existing = await this.storage.selectExistingEvent(
      executor,
      runId,
      withSeq.idempotencyKey
    );
    if (existing) {
      result.deduped.push(existing);
    }
    return false;
  }

  private resolveListLimit(runId: string, limit: number | undefined): number | undefined {
    if (limit === undefined) {
      return undefined;
    }
    if (!Number.isInteger(limit) || limit < 0) {
      throw new InvalidListEventsLimitError(runId, limit);
    }
    return limit;
  }
}
