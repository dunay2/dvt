/**
 * @baseline ADR-0003
 */
import { parseEngineRunRef } from '@dvt/contracts';

import { InvalidRunIdError, RunAlreadyExistsError, RunNotFoundError } from '../contracts/errors.js';
import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';
import { normalizeEngineRunRef } from '../core/lifecycle/coreRuntime.js';
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
  reserveInMemoryRetryAttempt,
  saveInMemoryProviderRef,
} from './InMemoryRunStateAdminSupport.js';
import {
  getInMemoryRunMetadata,
  listInMemoryRunEvents,
  listInMemoryRuns,
} from './InMemoryRunStateReadSupport.js';
import {
  getInMemorySnapshot,
  isInMemorySnapshotStale,
  listInMemoryStaleSnapshotRuns,
  rebuildInMemorySnapshot,
} from './InMemoryRunStateSnapshotSupport.js';
import {
  captureRetryLineageCheckpoint,
  initializeRetryLineageFromMetadata,
  restoreRetryLineageCheckpoint,
} from './retryLineagePolicy.js';
import {
  assertEventTenantMatches,
  assertEventRunIdMatches,
  assertEventsMatchRunIdAndTenant,
  assertRunEventInput,
  assertRunSequenceWithinSafeRange,
  buildPersistedRunEventRecord,
  cloneWorkflowSnapshot,
  createDefaultWorkflowSnapshot,
  IN_MEMORY_PERSISTED_AT_EPOCH_ISO,
} from './runEventWritePolicy.js';

type InMemoryRunStateCoreOptions = {
  commitOutbox?: (runId: string, events: RunEventPersisted[]) => Promise<void>;
};

type InMemoryAppendContext = {
  baseRunSeq: number;
  existingEvents: RunEventPersisted[];
  tenantId: string;
};

type PlannedInMemoryAppend = {
  appended: RunEventPersisted[];
  committed: RunEventPersisted[];
  deduped: RunEventPersisted[];
  idempotencyIndex: Map<string, RunEventPersisted>;
  nextSnapshot: WorkflowSnapshot | null;
};

export class InMemoryRunStateCore implements IRunStateStore, IRunSnapshotStalenessQuery {
  readonly metadataByRunId = new Map<string, RunMetadata>();
  readonly eventsByRunId = new Map<string, RunEventPersisted[]>();
  readonly idempIndexByRunId = new Map<string, Map<string, RunEventPersisted>>();
  readonly snapshotByRunId = new Map<string, WorkflowSnapshot>();
  readonly snapshotLastRunSeqByRunId = new Map<string, number>();
  readonly nextRetryAttemptByOriginRunId = new Map<string, number>();
  private readonly commitOutbox: (runId: string, events: RunEventPersisted[]) => Promise<void>;

  constructor(options: InMemoryRunStateCoreOptions = {}) {
    this.commitOutbox = options.commitOutbox ?? (async () => {});
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    return getInMemoryRunMetadata(this, tenantId, runId);
  }

  async saveProviderRef(
    tenantId: string,
    runId: string,
    providerRef: RunMetadata['providerRef']
  ): Promise<RunMetadata> {
    return saveInMemoryProviderRef(this, tenantId, runId, providerRef);
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    const metadata: RunMetadata = {
      ...input.metadata,
      providerRef: normalizeEngineRunRef(parseEngineRunRef(input.metadata.providerRef)),
    };
    if (this.metadataByRunId.has(metadata.runId)) {
      throw new RunAlreadyExistsError(metadata.runId);
    }

    assertEventsMatchRunIdAndTenant(metadata.runId, metadata.tenantId, input.firstEvents);
    const retryLineageCheckpoint = captureRetryLineageCheckpoint(
      this.nextRetryAttemptByOriginRunId,
      metadata
    );

    this.metadataByRunId.set(metadata.runId, metadata);
    initializeRetryLineageFromMetadata(this.nextRetryAttemptByOriginRunId, metadata);
    this.snapshotByRunId.set(metadata.runId, createDefaultWorkflowSnapshot(metadata.runId));
    this.snapshotLastRunSeqByRunId.set(metadata.runId, 0);
    try {
      return await this.appendAndEnqueueTx(metadata.runId, input.firstEvents);
    } catch (error) {
      this.metadataByRunId.delete(metadata.runId);
      this.snapshotByRunId.delete(metadata.runId);
      this.snapshotLastRunSeqByRunId.delete(metadata.runId);
      restoreRetryLineageCheckpoint(this.nextRetryAttemptByOriginRunId, retryLineageCheckpoint);
      throw error;
    }
  }

  /**
   * Atomic in this in-memory implementation: outbox enqueue and event-state commit
   * happen as a single ordered mutation from the caller's perspective.
   */
  async appendAndEnqueueTx(runId: string, eventsToAppend: RunEventInput[]): Promise<AppendResult> {
    this.assertRunExists(runId);
    const context = this.getAppendContext(runId);

    if (eventsToAppend.length === 0) {
      return { appended: [], deduped: [], lastSeq: context.baseRunSeq };
    }

    const plannedAppend = this.planAppendMutation(runId, context, eventsToAppend);

    await this.commitOutbox(runId, plannedAppend.appended);

    this.applyAppendMutation(runId, plannedAppend);

    return {
      appended: plannedAppend.appended,
      deduped: plannedAppend.deduped,
      lastSeq: plannedAppend.appended.at(-1)?.runSeq ?? context.baseRunSeq,
    };
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<RunEventPersisted[]> {
    return listInMemoryRunEvents(this, tenantId, runId, options?.afterSeq, options?.limit);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    return listInMemoryRuns(this, options.tenantId, options.status, options.limit);
  }

  async getSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot | null> {
    return getInMemorySnapshot(this, tenantId, runId);
  }

  async rebuildSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot> {
    return rebuildInMemorySnapshot(this, tenantId, runId);
  }

  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    return listInMemoryStaleSnapshotRuns(this, batchSize);
  }

  async isSnapshotStale(tenantId: string, runId: string): Promise<boolean> {
    return isInMemorySnapshotStale(this, tenantId, runId);
  }

  async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: string
  ): Promise<RetryAttemptReservation> {
    return reserveInMemoryRetryAttempt(this, tenantId, sourceRunId);
  }

  private assertRunExists(runId: string): void {
    if (!runId) {
      throw new InvalidRunIdError(runId);
    }
    if (!this.metadataByRunId.has(runId)) {
      throw new RunNotFoundError(runId);
    }
  }

  private getAppendContext(runId: string): InMemoryAppendContext {
    const existingEvents = this.eventsByRunId.get(runId) ?? [];
    const tenantId = this.metadataByRunId.get(runId)?.tenantId;
    if (tenantId === undefined) {
      throw new RunNotFoundError(runId);
    }

    return {
      baseRunSeq: existingEvents.length,
      existingEvents,
      tenantId,
    };
  }

  private planAppendMutation(
    runId: string,
    context: InMemoryAppendContext,
    eventsToAppend: readonly RunEventInput[]
  ): PlannedInMemoryAppend {
    const idempotencyIndex = new Map<string, RunEventPersisted>(this.idempIndexByRunId.get(runId));
    const appended: RunEventPersisted[] = [];
    const deduped: RunEventPersisted[] = [];

    for (const [index, event] of eventsToAppend.entries()) {
      assertRunEventInput(event, index);
      assertEventRunIdMatches(runId, event, index);
      assertEventTenantMatches(context.tenantId, event, index);

      const existing = idempotencyIndex.get(event.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const nextEvent = buildPlannedPersistedEvent(
        runId,
        context.baseRunSeq,
        appended.length,
        event,
        index
      );
      appended.push(nextEvent);
      idempotencyIndex.set(nextEvent.idempotencyKey, nextEvent);
    }

    return {
      appended,
      committed: [...context.existingEvents, ...appended],
      deduped,
      idempotencyIndex,
      nextSnapshot: this.buildNextSnapshot(runId, appended),
    };
  }

  private buildNextSnapshot(
    runId: string,
    appended: readonly RunEventPersisted[]
  ): WorkflowSnapshot | null {
    if (appended.length === 0) {
      return null;
    }

    const currentSnapshot = this.snapshotByRunId.get(runId) ?? createDefaultWorkflowSnapshot(runId);
    const nextSnapshot = cloneWorkflowSnapshot(currentSnapshot);
    for (const event of appended) {
      applyRunEvent(nextSnapshot, event);
    }

    return nextSnapshot;
  }

  private applyAppendMutation(runId: string, plannedAppend: PlannedInMemoryAppend): void {
    this.eventsByRunId.set(runId, plannedAppend.committed);
    this.idempIndexByRunId.set(runId, plannedAppend.idempotencyIndex);
    if (plannedAppend.nextSnapshot) {
      this.snapshotByRunId.set(runId, plannedAppend.nextSnapshot);
    }
    this.snapshotLastRunSeqByRunId.set(runId, plannedAppend.committed.at(-1)?.runSeq ?? 0);
  }
}

function buildPlannedPersistedEvent(
  runId: string,
  baseRunSeq: number,
  appendedCount: number,
  event: RunEventInput,
  index: number
): RunEventPersisted {
  const runSeq = baseRunSeq + appendedCount + 1;
  assertRunSequenceWithinSafeRange(runSeq, runId);
  return buildPersistedRunEventRecord(event, runSeq, IN_MEMORY_PERSISTED_AT_EPOCH_ISO, index);
}
