/**
 * @baseline ADR-0003
 */
import { InvalidRunIdError, RunAlreadyExistsError, RunNotFoundError } from '../contracts/errors.js';
import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';
import { applyRunEvent } from '../core/SnapshotProjector.js';
import type { IRunSnapshotStalenessQuery } from '../ports/IRunSnapshotStalenessQuery.js';
import type {
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RetryAttemptReservation,
  RunBootstrapInput,
} from '../ports/IRunStateStore.js';

import {
  captureRetryLineageCheckpoint,
  initializeRetryLineageFromMetadata,
  reserveRetryAttemptFromSource,
  restoreRetryLineageCheckpoint,
} from './retryLineagePolicy.js';
import {
  assertEventTenantMatches,
  assertEventRunIdMatches,
  assertEventsMatchRunIdAndTenant,
  assertRunEventInput,
  assertRunSequenceWithinSafeRange,
  cloneWorkflowSnapshot,
  createDefaultWorkflowSnapshot,
  IN_MEMORY_PERSISTED_AT_EPOCH_ISO,
} from './runEventWritePolicy.js';
import { collectStaleSnapshotRuns, isSnapshotProjectionStale } from './snapshotStaleness.js';

export class InMemoryRunStateStore implements IRunStateStore, IRunSnapshotStalenessQuery {
  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, RunEventPersisted[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, RunEventPersisted>>();
  private readonly snapshotByRunId = new Map<string, WorkflowSnapshot>();
  private readonly snapshotLastRunSeqByRunId = new Map<string, number>();
  private readonly nextRetryAttemptByOriginRunId = new Map<string, number>();

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    const meta = this.metadataByRunId.get(runId) ?? null;
    if (!meta) return null;
    return meta.tenantId === tenantId ? meta : null;
  }

  async saveProviderRef(
    tenantId: string,
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
    if (current?.tenantId !== tenantId) throw new RunNotFoundError(runId);
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
      throw new RunAlreadyExistsError(input.metadata.runId);
    }

    assertEventsMatchRunIdAndTenant(
      input.metadata.runId,
      input.metadata.tenantId,
      input.firstEvents
    );
    const retryLineageCheckpoint = captureRetryLineageCheckpoint(
      this.nextRetryAttemptByOriginRunId,
      input.metadata
    );

    // Atomic block (no awaits): write metadata + first events together.
    this.metadataByRunId.set(input.metadata.runId, input.metadata);
    initializeRetryLineageFromMetadata(this.nextRetryAttemptByOriginRunId, input.metadata);
    // Seed empty snapshot so getSnapshot never returns null for a bootstrapped run.
    this.snapshotByRunId.set(
      input.metadata.runId,
      createDefaultWorkflowSnapshot(input.metadata.runId)
    );
    this.snapshotLastRunSeqByRunId.set(input.metadata.runId, 0);
    try {
      return await this.appendAndEnqueueTx(input.metadata.runId, input.firstEvents);
    } catch (error) {
      this.metadataByRunId.delete(input.metadata.runId);
      this.snapshotByRunId.delete(input.metadata.runId);
      this.snapshotLastRunSeqByRunId.delete(input.metadata.runId);
      restoreRetryLineageCheckpoint(this.nextRetryAttemptByOriginRunId, retryLineageCheckpoint);
      throw error;
    }
  }

  async appendAndEnqueueTx(runId: string, eventsToAppend: RunEventInput[]): Promise<AppendResult> {
    this.assertRunExists(runId);

    const events = this.eventsByRunId.get(runId) ?? [];
    const baseRunSeq = events.length;
    const idx = new Map<string, RunEventPersisted>(this.idempIndexByRunId.get(runId));
    const tenantId = this.metadataByRunId.get(runId)?.tenantId;
    if (tenantId === undefined) {
      throw new RunNotFoundError(runId);
    }

    const appended: RunEventPersisted[] = [];
    const deduped: RunEventPersisted[] = [];
    const persistedAt = IN_MEMORY_PERSISTED_AT_EPOCH_ISO;

    for (const [i, env] of eventsToAppend.entries()) {
      assertRunEventInput(env, i);
      assertEventRunIdMatches(runId, env, i);
      assertEventTenantMatches(tenantId, env, i);

      const existing = idx.get(env.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const runSeq = baseRunSeq + appended.length + 1;
      assertRunSequenceWithinSafeRange(runSeq, runId);
      const withSeq: RunEventPersisted = { ...env, runSeq, persistedAt };
      appended.push(withSeq);
      idx.set(withSeq.idempotencyKey, withSeq);
    }

    const committed = events.concat(appended);
    let nextSnapshot: WorkflowSnapshot | null = null;
    if (appended.length > 0) {
      const currentSnapshot =
        this.snapshotByRunId.get(runId) ?? createDefaultWorkflowSnapshot(runId);
      nextSnapshot = cloneWorkflowSnapshot(currentSnapshot);
      for (const e of appended) {
        applyRunEvent(nextSnapshot, e);
      }
    }

    // "Transactional" commit (single mutation point)
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idx);
    if (nextSnapshot) {
      this.snapshotByRunId.set(runId, nextSnapshot);
    }
    this.snapshotLastRunSeqByRunId.set(runId, committed.at(-1)?.runSeq ?? 0);

    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? baseRunSeq,
    };
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
    const limit = options.limit ?? 50;
    const all = Array.from(this.metadataByRunId.values());
    const byTenant = all.filter((m) => m.tenantId === options.tenantId);
    const byStatus =
      options.status === undefined
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
      throw new RunNotFoundError(runId);
    }
    const events = (this.eventsByRunId.get(runId) ?? [])
      .slice()
      .sort((a, b) => a.runSeq - b.runSeq);
    const snap: WorkflowSnapshot = createDefaultWorkflowSnapshot(runId);
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
    return collectStaleSnapshotRuns(
      this.metadataByRunId.values(),
      (runId) => this.snapshotLastRunSeqByRunId.get(runId),
      (runId) => this.eventsByRunId.get(runId)?.at(-1)?.runSeq ?? 0,
      batchSize
    );
  }

  async isSnapshotStale(tenantId: string, runId: string): Promise<boolean> {
    const metadata = this.metadataByRunId.get(runId);
    if (!metadata || metadata.tenantId !== tenantId) {
      return false;
    }

    return isSnapshotProjectionStale(
      () => this.snapshotLastRunSeqByRunId.get(runId),
      () => this.eventsByRunId.get(runId)?.at(-1)?.runSeq ?? 0
    );
  }

  async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: string
  ): Promise<RetryAttemptReservation> {
    const sourceMeta = this.metadataByRunId.get(sourceRunId);
    if (!sourceMeta || sourceMeta.tenantId !== tenantId) {
      throw new RunNotFoundError(sourceRunId);
    }

    return reserveRetryAttemptFromSource(this.nextRetryAttemptByOriginRunId, sourceMeta);
  }

  private assertRunExists(runId: string): void {
    if (!runId) {
      throw new InvalidRunIdError(runId);
    }
    if (!this.metadataByRunId.has(runId)) {
      throw new RunNotFoundError(runId);
    }
  }
}
