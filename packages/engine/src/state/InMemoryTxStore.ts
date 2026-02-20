import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';
import { applyRunEvent } from '../core/SnapshotProjector.js';
import type { DeadLetterRecord, IOutboxStorage, OutboxRecord } from '../outbox/types.js';
import { MAX_OUTBOX_ATTEMPTS } from '../outbox/types.js';

import type { IRunStateStore, ListRunsOptions, RunBootstrapInput } from './IRunStateStore.js';

export class InMemoryTxStore implements IRunStateStore, IOutboxStorage {
  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, RunEventPersisted[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, RunEventPersisted>>();
  private readonly snapshotByRunId = new Map<string, WorkflowSnapshot>();

  private readonly pending: OutboxRecord[] = [];
  private readonly deadLetters: DeadLetterRecord[] = [];
  private outboxCounter = 0;

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.metadataByRunId.get(runId) ?? null;
  }

  /**
   * @deprecated Use bootstrapRunTx. This bypasses the atomicity guarantee that
   * metadata + first events are written together. Scheduled for removal in Phase 3.
   */
  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    this.metadataByRunId.set(meta.runId, meta);
  }

  async saveProviderRef(
    runId: string,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    const current = this.metadataByRunId.get(runId);
    if (!current) throw new Error(`RUN_NOT_FOUND: ${runId}`);
    this.metadataByRunId.set(runId, {
      ...current,
      providerWorkflowId: runRef.providerWorkflowId,
      providerRunId: runRef.providerRunId,
      ...(runRef.providerNamespace ? { providerNamespace: runRef.providerNamespace } : {}),
      ...(runRef.providerTaskQueue ? { providerTaskQueue: runRef.providerTaskQueue } : {}),
      ...(runRef.providerConductorUrl ? { providerConductorUrl: runRef.providerConductorUrl } : {}),
    });
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    if (this.metadataByRunId.has(input.metadata.runId)) {
      throw new Error('RUN_ALREADY_EXISTS');
    }

    // Atomic block (no awaits): write metadata + first events together.
    this.metadataByRunId.set(input.metadata.runId, input.metadata);
    this.snapshotByRunId.set(input.metadata.runId, {
      runId: input.metadata.runId,
      status: 'PENDING',
      paused: false,
      steps: {},
    });
    return this.appendAndEnqueueTx(input.metadata.runId, input.firstEvents);
  }

  /**
   * Atomic in this in-memory implementation: assigning runSeq, appending, and enqueueing to outbox
   * happen as a single mutation.
   */
  async appendAndEnqueueTx(runId: string, envelopes: RunEventInput[]): Promise<AppendResult> {
    const events = this.eventsByRunId.get(runId) ?? [];
    const idx = this.idempIndexByRunId.get(runId) ?? new Map<string, RunEventPersisted>();

    const appended: RunEventPersisted[] = [];
    const deduped: RunEventPersisted[] = [];
    const persistedAt = '1970-01-01T00:00:00.000Z';

    for (const env of envelopes) {
      const existing = idx.get(env.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const runSeq = events.length + appended.length + 1;
      const withSeq: RunEventPersisted = { ...env, runSeq, persistedAt };
      appended.push(withSeq);
      idx.set(withSeq.idempotencyKey, withSeq);
    }

    // Commit events
    const committed = events.concat(appended);
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idx);

    // Incrementally update the materialized snapshot.
    if (appended.length > 0) {
      const snap: WorkflowSnapshot = this.snapshotByRunId.get(runId) ?? {
        runId,
        status: 'PENDING',
        paused: false,
        steps: {},
      };
      for (const e of appended) {
        applyRunEvent(snap, e);
      }
      this.snapshotByRunId.set(runId, snap);
    }

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
   * @deprecated Use appendAndEnqueueTx. Scheduled for removal in Phase 3.
   * In this store the two are equivalent, but in Postgres appendEventsTx
   * skips the outbox enqueue — a correctness hazard.
   */
  async appendEventsTx(runId: string, envelopes: RunEventInput[]): Promise<AppendResult> {
    return this.appendAndEnqueueTx(runId, envelopes);
  }

  async listEvents(runId: string): Promise<RunEventPersisted[]> {
    return (this.eventsByRunId.get(runId) ?? []).slice().sort((a, b) => a.runSeq - b.runSeq);
  }

  async listRuns(options?: ListRunsOptions): Promise<RunMetadata[]> {
    const limit = options?.limit ?? 50;
    const all = Array.from(this.metadataByRunId.values());
    const filtered = options?.tenantId ? all.filter((m) => m.tenantId === options.tenantId) : all;
    return filtered.slice(-limit).reverse();
  }

  async getSnapshot(runId: string): Promise<WorkflowSnapshot | null> {
    return this.snapshotByRunId.get(runId) ?? null;
  }

  async enqueueTx(_runId: string, _events: RunEventPersisted[]): Promise<void> {
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
    const idx = this.pending.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const rec = this.pending[idx]!;
    rec.attempts += 1;
    rec.lastError = error;

    if (rec.attempts >= MAX_OUTBOX_ATTEMPTS) {
      this.pending.splice(idx, 1);
      this.deadLetters.push({
        id: `dl_${rec.id}`,
        originalId: rec.id,
        runId: rec.payload.runId,
        payload: rec.payload,
        lastError: error,
        deadLetteredAt: '1970-01-01T00:00:00.000Z',
      });
    }
  }

  async listDeadLetter(limit: number): Promise<DeadLetterRecord[]> {
    return this.deadLetters.slice(0, limit);
  }
}
