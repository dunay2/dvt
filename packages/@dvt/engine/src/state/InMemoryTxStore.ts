/**
 * @baseline ADR-0003
 */
import type {
  DeadLetterRecord,
  IOutboxStorage,
  OutboxClaimSelection,
  OutboxRecord,
} from '@dvt/contracts';

import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';
import { applyRunEvent } from '../core/SnapshotProjector.js';
import type {
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RunBootstrapInput,
} from '../ports/IRunStateStore.js';

import { InMemoryOutboxState } from './InMemoryOutboxState.js';

export class InMemoryTxStore implements IRunStateStore, IOutboxStorage {
  private static readonly EPOCH_ISO = '1970-01-01T00:00:00.000Z';

  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, RunEventPersisted[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, RunEventPersisted>>();
  private readonly snapshotByRunId = new Map<string, WorkflowSnapshot>();
  private readonly snapshotLastRunSeqByRunId = new Map<string, number>();
  private readonly outbox: InMemoryOutboxState;

  constructor(deps?: { outboxNowMs?: () => number; outboxShardCount?: number }) {
    const outboxDeps: ConstructorParameters<typeof InMemoryOutboxState>[0] = {};
    if (deps?.outboxNowMs !== undefined) {
      outboxDeps.nowMs = deps.outboxNowMs;
    }
    if (deps?.outboxShardCount !== undefined) {
      outboxDeps.shardCount = deps.outboxShardCount;
    }
    this.outbox = new InMemoryOutboxState(outboxDeps);
  }

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
    if (Object.hasOwn(record, 'runSeq')) {
      throw new Error(`INVALID_EVENT_WRITE_SHAPE: runSeq forbidden at index ${index}`);
    }
    if (Object.hasOwn(record, 'persistedAt')) {
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
    _tenantId: string,
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
    this.snapshotLastRunSeqByRunId.set(input.metadata.runId, 0);
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
    this.snapshotLastRunSeqByRunId.set(runId, committed.at(-1)?.runSeq ?? 0);

    // Commit outbox in the same "transaction"
    await this.outbox.enqueueTx(runId, appended);

    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? baseRunSeq,
    };
  }

  /**
   * @deprecated Use appendAndEnqueueTx. Scheduled for removal in Phase 3.
   * In this store the two are equivalent, but in Postgres appendEventsTx
   * skips the outbox enqueue ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a correctness hazard.
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
    if (meta?.tenantId !== tenantId) return [];
    const all = (this.eventsByRunId.get(runId) ?? []).slice().sort((a, b) => a.runSeq - b.runSeq);
    const afterSeq = options?.afterSeq;
    const filtered = afterSeq === undefined ? all : all.filter((e) => e.runSeq > afterSeq);
    return options?.limit === undefined ? filtered : filtered.slice(0, options.limit);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    const limit = options?.limit ?? 50;
    const all = Array.from(this.metadataByRunId.values());
    const byTenant = all.filter((m) => m.tenantId === options.tenantId);
    const byStatus =
      options?.status === undefined
        ? byTenant
        : byTenant.filter((m) => this.snapshotByRunId.get(m.runId)?.status === options.status);
    return byStatus.slice(-limit).reverse();
  }

  async getSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot | null> {
    const meta = this.metadataByRunId.get(runId);
    if (meta?.tenantId !== tenantId) return null;
    return this.snapshotByRunId.get(runId) ?? null;
  }

  async rebuildSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot> {
    const meta = this.metadataByRunId.get(runId);
    if (meta?.tenantId !== tenantId) {
      throw new Error(`RUN_NOT_FOUND: ${runId}`);
    }
    const events = (this.eventsByRunId.get(runId) ?? [])
      .slice()
      .sort((a, b) => a.runSeq - b.runSeq);
    const snap: WorkflowSnapshot = this.createDefaultSnapshot(runId);
    for (const e of events) {
      applyRunEvent(snap, e);
    }
    this.snapshotByRunId.set(runId, snap);
    this.snapshotLastRunSeqByRunId.set(runId, events.at(-1)?.runSeq ?? 0);
    return snap;
  }

  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    const runs = Array.from(this.metadataByRunId.values())
      .filter((meta) => {
        const events = this.eventsByRunId.get(meta.runId) ?? [];
        const snapshotLastRunSeq = this.snapshotLastRunSeqByRunId.get(meta.runId);
        if (snapshotLastRunSeq === undefined) return true;
        const latestRunSeq = events.at(-1)?.runSeq ?? 0;
        return snapshotLastRunSeq < latestRunSeq;
      })
      .sort((left, right) => {
        const leftCreatedAt = Date.parse(left.createdAt ?? '');
        const rightCreatedAt = Date.parse(right.createdAt ?? '');
        return leftCreatedAt - rightCreatedAt || left.runId.localeCompare(right.runId);
      });

    return runs.slice(0, batchSize).map((meta) => ({
      runId: meta.runId,
      tenantId: meta.tenantId,
    }));
  }

  async enqueueTx(_runId: string, _events: RunEventPersisted[]): Promise<void> {
    await this.outbox.enqueueTx(_runId, _events);
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.outbox.listPending(limit);
  }

  async listPendingForClaim(
    limit: number,
    selection?: OutboxClaimSelection
  ): Promise<OutboxRecord[]> {
    return this.outbox.listPendingForClaim(limit, selection);
  }

  async markDelivered(ids: string[]): Promise<void> {
    await this.outbox.markDelivered(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.outbox.markFailed(id, error);
  }

  async hasPendingRetries(selection?: OutboxClaimSelection): Promise<boolean> {
    return this.outbox.hasPendingRetries(selection);
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    return this.outbox.listDeadLetter(limit, tenantId);
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    return this.outbox.replayDeadLetters(options);
  }
}
