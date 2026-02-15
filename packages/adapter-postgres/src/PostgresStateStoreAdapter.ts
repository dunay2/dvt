import type {
  AppendResult,
  EventEnvelope,
  IOutboxStorage,
  IRunStateStore,
  OutboxRecord,
  RunMetadata,
} from './types.js';

export interface PostgresAdapterConfig {
  connectionString?: string;
  schema?: string;
}

/**
 * Foundation adapter for issue #6.
 *
 * This class exposes the active runtime contracts expected by engine/temporal.
 * Persistence is in-memory in this phase, while constructor/config already model
 * PostgreSQL wiring to allow incremental migration to SQL-backed storage.
 */
export class PostgresStateStoreAdapter implements IRunStateStore, IOutboxStorage {
  private readonly runMetadata = new Map<string, RunMetadata>();
  private readonly runEvents = new Map<string, EventEnvelope[]>();
  private readonly outbox = new Map<string, OutboxRecord>();

  constructor(readonly config: PostgresAdapterConfig = {}) {}

  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.runMetadata.set(meta.runId, { ...meta });
  }

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.runMetadata.get(runId) ?? null;
  }

  async appendEventsTx(
    runId: string,
    envelopes: Omit<EventEnvelope, 'runSeq'>[]
  ): Promise<AppendResult> {
    const existing = this.runEvents.get(runId) ?? [];
    const existingByIdempotency = new Map(existing.map((e) => [e.idempotencyKey, e]));

    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    let nextRunSeq = existing.length + 1;
    for (const envelope of envelopes) {
      const already = existingByIdempotency.get(envelope.idempotencyKey);
      if (already) {
        deduped.push(already);
        continue;
      }

      const withSeq: EventEnvelope = {
        ...envelope,
        runSeq: nextRunSeq,
      } as EventEnvelope;

      nextRunSeq += 1;
      existing.push(withSeq);
      existingByIdempotency.set(withSeq.idempotencyKey, withSeq);
      appended.push(withSeq);
    }

    this.runEvents.set(runId, existing);
    return { appended, deduped };
  }

  async listEvents(runId: string): Promise<EventEnvelope[]> {
    return [...(this.runEvents.get(runId) ?? [])];
  }

  async enqueueTx(runId: string, events: EventEnvelope[]): Promise<void> {
    const createdAt = new Date().toISOString();
    for (const event of events) {
      const id = `${runId}:${event.runSeq}`;
      this.outbox.set(id, {
        id,
        createdAt,
        idempotencyKey: event.idempotencyKey,
        payload: event,
        attempts: 0,
      });
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return [...this.outbox.values()]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, Math.max(0, limit));
  }

  async markDelivered(ids: string[]): Promise<void> {
    for (const id of ids) this.outbox.delete(id);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const current = this.outbox.get(id);
    if (!current) return;
    this.outbox.set(id, {
      ...current,
      attempts: current.attempts + 1,
      lastError: error,
    });
  }
}
