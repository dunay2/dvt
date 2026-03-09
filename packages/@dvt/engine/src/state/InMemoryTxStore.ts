/**
 * @baseline ADR-0003
 */
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
import type {
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RunBootstrapInput,
} from '../ports/IRunStateStore.js';

export class InMemoryTxStore implements IRunStateStore, IOutboxStorage {
  private static readonly EPOCH_ISO = '1970-01-01T00:00:00.000Z';

  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, RunEventPersisted[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, RunEventPersisted>>();
  private readonly snapshotByRunId = new Map<string, WorkflowSnapshot>();

  private readonly pending: OutboxRecord[] = [];
  private readonly deadLetters: DeadLetterRecord[] = [];
  private outboxCounter = 0;

  private createDefaultSnapshot(runId: string): WorkflowSnapshot {
    return {
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
  }

  private assertRunExists(runId: string): void {
    if (!runId) {
      throw new Error('INVALID_RUN_ID');
    }
    if (!this.metadataByRunId.has(runId)) {
      throw new Error(`RUN_NOT_FOUND: ${runId}`);
    }
  }

  private assertEventInput(event: RunEventInput, index: number): void {
    if (!event?.idempotencyKey) {
      throw new Error(`INVALID_EVENT: missing idempotencyKey at index ${index}`);
    }
    if (!event?.runId) {
      throw new Error(`INVALID_EVENT: missing runId at index ${index}`);
    }
    if (event.runId.trim() === '') {
      throw new Error(`INVALID_EVENT: empty runId at index ${index}`);
    }

    const record = event as unknown as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(record, 'runSeq')) {
      throw new Error(`INVALID_EVENT_WRITE_SHAPE: runSeq forbidden at index ${index}`);
    }
    if (Object.prototype.hasOwnProperty.call(record, 'persistedAt')) {
      throw new Error(`INVALID_EVENT_WRITE_SHAPE: persistedAt forbidden at index ${index}`);
    }
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    const meta = this.metadataByRunId.get(runId) ?? null;
    if (!meta) return null;
    return meta.tenantId === tenantId ? meta : null;
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
    const updated = {
      ...current,
      providerWorkflowId: runRef.providerWorkflowId,
      providerRunId: runRef.providerRunId,
    };
    if (runRef.providerNamespace) {
      updated.providerNamespace = runRef.providerNamespace;
    }
    if (runRef.providerTaskQueue) {
      updated.providerTaskQueue = runRef.providerTaskQueue;
    }
    if (runRef.providerConductorUrl) {
      updated.providerConductorUrl = runRef.providerConductorUrl;
    }
    this.metadataByRunId.set(runId, updated);
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    if (this.metadataByRunId.has(input.metadata.runId)) {
      throw new Error('RUN_ALREADY_EXISTS');
    }

    // Atomic block (no awaits): write metadata + first events together.
    this.metadataByRunId.set(input.metadata.runId, input.metadata);
    this.snapshotByRunId.set(
      input.metadata.runId,
      this.createDefaultSnapshot(input.metadata.runId)
    );
    return this.appendAndEnqueueTx(input.metadata.runId, input.firstEvents);
  }

  /**
   * Atomic in this in-memory implementation: assigning runSeq, appending, and enqueueing to outbox
   * happen as a single synchronous mutation (no awaits in the critical section).
   *
   * Note: this atomicity guarantee is process-local and only applies to this in-memory store.
   */
  async appendAndEnqueueTx(runId: string, eventsToAppend: RunEventInput[]): Promise<AppendResult> {
    this.assertRunExists(runId);

    const existingEvents = this.eventsByRunId.get(runId) ?? [];
    const baseRunSeq = existingEvents.length;

    if (eventsToAppend.length === 0) {
      return { appended: [], deduped: [], lastSeq: baseRunSeq };
    }

    const idempotencyIndex =
      this.idempIndexByRunId.get(runId) ?? new Map<string, RunEventPersisted>();

    const appended: RunEventPersisted[] = [];
    const deduped: RunEventPersisted[] = [];
    const persistedAt = InMemoryTxStore.EPOCH_ISO;

    for (const [i, event] of eventsToAppend.entries()) {
      this.assertEventInput(event, i);
      if (event.runId !== runId) {
        throw new Error(`INVALID_EVENT: runId mismatch at index ${i}`);
      }

      const existing = idempotencyIndex.get(event.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const runSeq = baseRunSeq + appended.length + 1;
      if (runSeq > Number.MAX_SAFE_INTEGER) {
        throw new Error(`RUN_SEQUENCE_OVERFLOW: ${runId}`);
      }

      const withSeq: RunEventPersisted = { ...event, runSeq, persistedAt };
      appended.push(withSeq);
      idempotencyIndex.set(withSeq.idempotencyKey, withSeq);
    }

    // Commit events
    const committed = [...existingEvents, ...appended];
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idempotencyIndex);

    // Incrementally update the materialized snapshot.
    if (appended.length > 0) {
      const snap: WorkflowSnapshot =
        this.snapshotByRunId.get(runId) ?? this.createDefaultSnapshot(runId);
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
        createdAt: InMemoryTxStore.EPOCH_ISO,
        idempotencyKey: e.idempotencyKey,
        payload: e,
        attempts: 0,
      });
    }

    return {
      appended,
      deduped,
      lastSeq: appended[appended.length - 1]?.runSeq ?? baseRunSeq,
    };
  }

  /**
   * @deprecated Use appendAndEnqueueTx. Scheduled for removal in Phase 3.
   * In this store the two are equivalent, but in Postgres appendEventsTx
   * skips the outbox enqueue — a correctness hazard.
   */
  async appendEventsTx(runId: string, envelopes: RunEventInput[]): Promise<AppendResult> {
    return this.appendAndEnqueueTx(runId, envelopes);
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<RunEventPersisted[]> {
    const meta = this.metadataByRunId.get(runId);
    if (!meta || meta.tenantId !== tenantId) return [];
    const all = (this.eventsByRunId.get(runId) ?? []).slice().sort((a, b) => a.runSeq - b.runSeq);
    const afterSeq = options?.afterSeq;
    const filtered = afterSeq !== undefined ? all.filter((e) => e.runSeq > afterSeq) : all;
    return options?.limit !== undefined ? filtered.slice(0, options.limit) : filtered;
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    const limit = options?.limit ?? 50;
    const all = Array.from(this.metadataByRunId.values());
    const byTenant = all.filter((m) => m.tenantId === options.tenantId);
    const byStatus =
      options?.status !== undefined
        ? byTenant.filter((m) => this.snapshotByRunId.get(m.runId)?.status === options.status)
        : byTenant;
    return byStatus.slice(-limit).reverse();
  }

  async getSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot | null> {
    const meta = this.metadataByRunId.get(runId);
    if (!meta || meta.tenantId !== tenantId) return null;
    return this.snapshotByRunId.get(runId) ?? null;
  }

  async enqueueTx(_runId: string, _events: RunEventPersisted[]): Promise<void> {
    // No-op: enqueue is already performed inside appendAndEnqueueTx for this store.
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
        deadLetteredAt: InMemoryTxStore.EPOCH_ISO,
      });
    }
  }

  async hasPendingRetries(): Promise<boolean> {
    return this.pending.some((record) => record.attempts > 0);
  }

  async listDeadLetter(limit: number): Promise<DeadLetterRecord[]> {
    return this.deadLetters.slice(0, limit);
  }
}
