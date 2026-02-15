import type { EventEnvelope, RunMetadata } from '../contracts/runEvents.js';
import type { IOutboxStorage, OutboxRecord } from '../outbox/types.js';

import type { AppendResult, IRunStateStore } from './IRunStateStore.js';

export class InMemoryTxStore implements IRunStateStore, IOutboxStorage {
  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, EventEnvelope[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, EventEnvelope>>();

  private readonly pending: OutboxRecord[] = [];
  private outboxCounter = 0;

  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.metadataByRunId.set(meta.runId, meta);
  }

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.metadataByRunId.get(runId) ?? null;
  }

  /**
   * Atomic in this in-memory implementation: assigning runSeq, appending, and enqueueing to outbox
   * happen as a single mutation.
   */
  async appendEventsTx(
    runId: string,
    envelopes: Omit<EventEnvelope, 'runSeq'>[]
  ): Promise<AppendResult> {
    const events = this.eventsByRunId.get(runId) ?? [];
    const idx = this.idempIndexByRunId.get(runId) ?? new Map<string, EventEnvelope>();

    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

    for (const env of envelopes) {
      const existing = idx.get(env.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const runSeq = events.length + appended.length + 1;
      const withSeq: EventEnvelope = { ...(env as EventEnvelope), runSeq };
      appended.push(withSeq);
      idx.set(withSeq.idempotencyKey, withSeq);
    }

    // Commit events
    const committed = events.concat(appended);
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idx);

    // Commit outbox in the same "transaction"
    for (const e of appended) {
      this.outboxCounter += 1;
      this.pending.push({
        id: `outbox_${this.outboxCounter}`,
        createdAt: '1970-01-01T00:00:00.000Z',
        idempotencyKey: e.idempotencyKey,
        payload: e,
        attempts: 0,
      });
    }

    return { appended, deduped };
  }

  /**
   * Transactional shortcut for stores that can atomically append and enqueue.
   * In this in-memory store, appendEventsTx already enqueues internally.
   */
  async appendAndEnqueueTx(
    runId: string,
    envelopes: Omit<EventEnvelope, 'runSeq'>[],
    _outbox: IOutboxStorage
  ): Promise<AppendResult> {
    return this.appendEventsTx(runId, envelopes);
  }

  async listEvents(runId: string): Promise<EventEnvelope[]> {
    return this.eventsByRunId.get(runId) ?? [];
  }

  async enqueueTx(_runId: string, _events: EventEnvelope[]): Promise<void> {
    // No-op: enqueue is already performed inside appendEventsTx for this store.
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.pending.slice(0, limit);
  }

  async markDelivered(ids: string[]): Promise<void> {
    const set = new Set(ids);
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (set.has(this.pending[i]!.id)) {
        this.pending.splice(i, 1);
      }
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const rec = this.pending.find((r) => r.id === id);
    if (!rec) return;
    rec.attempts += 1;
    rec.lastError = error;
  }
}
