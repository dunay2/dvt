'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InMemoryTxStore = void 0;
const SnapshotProjector_js_1 = require('../core/SnapshotProjector.js');
const types_js_1 = require('../outbox/types.js');
class InMemoryTxStore {
  constructor() {
    this.metadataByRunId = new Map();
    this.eventsByRunId = new Map();
    this.idempIndexByRunId = new Map();
    this.snapshotByRunId = new Map();
    this.pending = [];
    this.deadLetters = [];
    this.outboxCounter = 0;
  }
  createDefaultSnapshot(runId) {
    return {
      runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      steps: {},
    };
  }
  assertRunExists(runId) {
    if (!runId) {
      throw new Error('INVALID_RUN_ID');
    }
    if (!this.metadataByRunId.has(runId)) {
      throw new Error(`RUN_NOT_FOUND: ${runId}`);
    }
  }
  assertEventInput(event, index) {
    if (!event?.idempotencyKey) {
      throw new Error(`INVALID_EVENT: missing idempotencyKey at index ${index}`);
    }
    if (!event?.runId) {
      throw new Error(`INVALID_EVENT: missing runId at index ${index}`);
    }
    if (event.runId.trim() === '') {
      throw new Error(`INVALID_EVENT: empty runId at index ${index}`);
    }
  }
  async getRunMetadataByRunId(runId) {
    return this.metadataByRunId.get(runId) ?? null;
  }
  /**
   * @deprecated Use bootstrapRunTx. This bypasses the atomicity guarantee that
   * metadata + first events are written together. Scheduled for removal in Phase 3.
   */
  async saveRunMetadata(meta) {
    this.metadataByRunId.set(meta.runId, meta);
  }
  async saveProviderRef(runId, runRef) {
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
  async bootstrapRunTx(input) {
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
  async appendAndEnqueueTx(runId, eventsToAppend) {
    this.assertRunExists(runId);
    if (eventsToAppend.length === 0) {
      return { appended: [], deduped: [] };
    }
    const existingEvents = this.eventsByRunId.get(runId) ?? [];
    const idempotencyIndex = this.idempIndexByRunId.get(runId) ?? new Map();
    const baseRunSeq = existingEvents.length;
    const appended = [];
    const deduped = [];
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
      const withSeq = { ...event, runSeq, persistedAt };
      appended.push(withSeq);
      idempotencyIndex.set(withSeq.idempotencyKey, withSeq);
    }
    // Commit events
    const committed = [...existingEvents, ...appended];
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idempotencyIndex);
    // Incrementally update the materialized snapshot.
    if (appended.length > 0) {
      const snap = this.snapshotByRunId.get(runId) ?? this.createDefaultSnapshot(runId);
      for (const e of appended) {
        (0, SnapshotProjector_js_1.applyRunEvent)(snap, e);
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
    return { appended, deduped };
  }
  /**
   * @deprecated Use appendAndEnqueueTx. Scheduled for removal in Phase 3.
   * In this store the two are equivalent, but in Postgres appendEventsTx
   * skips the outbox enqueue — a correctness hazard.
   */
  async appendEventsTx(runId, envelopes) {
    return this.appendAndEnqueueTx(runId, envelopes);
  }
  async listEvents(runId) {
    return (this.eventsByRunId.get(runId) ?? []).slice().sort((a, b) => a.runSeq - b.runSeq);
  }
  async listRuns(options) {
    const limit = options?.limit ?? 50;
    const all = Array.from(this.metadataByRunId.values());
    const byTenant = options?.tenantId ? all.filter((m) => m.tenantId === options.tenantId) : all;
    const byStatus =
      options?.status !== undefined
        ? byTenant.filter((m) => this.snapshotByRunId.get(m.runId)?.status === options.status)
        : byTenant;
    return byStatus.slice(-limit).reverse();
  }
  async getSnapshot(runId) {
    return this.snapshotByRunId.get(runId) ?? null;
  }
  async enqueueTx(_runId, _events) {
    void _runId;
    void _events;
    // No-op: enqueue is already performed inside appendAndEnqueueTx for this store.
  }
  async listPending(limit) {
    return this.pending.slice(0, limit);
  }
  async markDelivered(ids) {
    const set = new Set(ids);
    for (let i = this.pending.length - 1; i >= 0; i--) {
      if (set.has(this.pending[i].id)) {
        this.pending.splice(i, 1);
      }
    }
  }
  async markFailed(id, error) {
    const idx = this.pending.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const rec = this.pending[idx];
    rec.attempts += 1;
    rec.lastError = error;
    if (rec.attempts >= types_js_1.MAX_OUTBOX_ATTEMPTS) {
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
  async listDeadLetter(limit) {
    return this.deadLetters.slice(0, limit);
  }
}
exports.InMemoryTxStore = InMemoryTxStore;
InMemoryTxStore.EPOCH_ISO = '1970-01-01T00:00:00.000Z';
//# sourceMappingURL=InMemoryTxStore.js.map
