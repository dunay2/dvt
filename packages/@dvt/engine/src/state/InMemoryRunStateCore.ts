/**
 * @file packages/@dvt/engine/src/state/InMemoryRunStateCore.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0039: Hexagonal Port Hardening And SOLID Remediation
 * @decision Implement in-memory run-state writes through event-log authority and port-owned lifecycle state
 * @consequence Local and test state stores replay canonical events instead of accepting provider state as truth
 * @version 1.0.0
 */
import { parseEngineRunRef } from '@dvt/contracts';

import { InvalidRunIdError, RunAlreadyExistsError, RunNotFoundError } from '../contracts/errors.js';
import type {
  AppendResult,
  EventEnvelope,
  EventInput,
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
  RecoveryRunBootstrapFactory,
  RecoveryRunBootstrapResult,
  RetryAttemptReservation,
  RunBootstrapInput,
  StartRunWrite,
  StartRunWriteResult,
} from '../ports/IRunStateStore.js';
import type { StartRunIntentClaimReceipt } from '../ports/IStartRunIntentStore.js';

import { applyInMemoryStartRunWrite } from './applyInMemoryStartRunWrite.js';
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
import { InMemoryStartRunIntentStore } from './InMemoryStartRunIntentStore.js';
import {
  captureRetryLineageCheckpoint,
  initializeRetryLineageFromMetadata,
  resolveRetryOriginRunId,
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
  commitOutbox?: (runId: string, events: EventEnvelope[]) => Promise<void>;
  startRunIntents?: InMemoryStartRunIntentStore;
};

type InMemoryAppendContext = {
  baseRunSeq: number;
  existingEvents: EventEnvelope[];
  tenantId: string;
};

type PlannedInMemoryAppend = {
  appended: EventEnvelope[];
  committed: EventEnvelope[];
  deduped: EventEnvelope[];
  idempotencyIndex: Map<string, EventEnvelope>;
  nextSnapshot: WorkflowSnapshot | null;
};

export class InMemoryRunStateCore implements IRunStateStore, IRunSnapshotStalenessQuery {
  readonly startRunIntents: InMemoryStartRunIntentStore;
  private readonly runWriteTails = new Map<string, Promise<void>>();
  readonly metadataByRunId = new Map<string, RunMetadata>();
  readonly eventsByRunId = new Map<string, EventEnvelope[]>();
  readonly idempIndexByRunId = new Map<string, Map<string, EventEnvelope>>();
  readonly snapshotByRunId = new Map<string, WorkflowSnapshot>();
  readonly snapshotLastRunSeqByRunId = new Map<string, number>();
  readonly nextRetryAttemptByOriginRunId = new Map<string, number>();
  private readonly recoveryBootstrapTailByOriginRunId = new Map<string, Promise<void>>();
  private readonly commitOutbox: (runId: string, events: EventEnvelope[]) => Promise<void>;

  constructor(options: InMemoryRunStateCoreOptions = {}) {
    this.commitOutbox = options.commitOutbox ?? (async () => {});
    this.startRunIntents = options.startRunIntents ?? new InMemoryStartRunIntentStore();
  }

  async applyStartRunWrite(
    receipt: StartRunIntentClaimReceipt,
    write: StartRunWrite
  ): Promise<StartRunWriteResult> {
    const result = await this.startRunIntents.withClaim(receipt, async (intent) => {
      if (write.kind !== 'fail' && intent.compensation.kind !== 'not_required')
        return 'invalid_state' as const;
      if (write.kind === 'fail' && intent.status !== 'DISPATCHED') return 'invalid_state' as const;
      return this.withRunWriteLock(receipt.runId, () =>
        applyInMemoryStartRunWrite(
          {
            getRunMetadataByRunId: (tenantId, runId) => this.getRunMetadataByRunId(tenantId, runId),
            getSnapshot: (tenantId, runId) => this.getSnapshot(tenantId, runId),
            bootstrapRunTx: (input) => this.bootstrapRunUnlocked(input),
            saveProviderRef: (tenantId, runId, ref) =>
              Promise.resolve(saveInMemoryProviderRef(this, tenantId, runId, ref)),
            appendAndEnqueueTx: (runId, events) => this.appendUnlocked(runId, events),
          },
          receipt,
          write
        )
      );
    });
    return result.kind === 'applied' ? result.value : result.kind;
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    return getInMemoryRunMetadata(this, tenantId, runId);
  }

  async hasEventByIdempotencyKey(
    tenantId: string,
    runId: string,
    idempotencyKey: string
  ): Promise<boolean> {
    if (this.metadataByRunId.get(runId)?.tenantId !== tenantId) return false;
    return this.idempIndexByRunId.get(runId)?.has(idempotencyKey) ?? false;
  }

  async saveProviderRef(
    tenantId: string,
    runId: string,
    providerRef: RunMetadata['providerRef']
  ): Promise<RunMetadata> {
    return this.withRunWriteLock(runId, async () =>
      saveInMemoryProviderRef(this, tenantId, runId, providerRef)
    );
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    return this.withRunWriteLock(input.metadata.runId, () => this.bootstrapRunUnlocked(input));
  }

  private async bootstrapRunUnlocked(input: RunBootstrapInput): Promise<AppendResult> {
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
      return await this.appendUnlocked(metadata.runId, input.firstEvents);
    } catch (error) {
      this.metadataByRunId.delete(metadata.runId);
      this.snapshotByRunId.delete(metadata.runId);
      this.snapshotLastRunSeqByRunId.delete(metadata.runId);
      restoreRetryLineageCheckpoint(this.nextRetryAttemptByOriginRunId, retryLineageCheckpoint);
      throw error;
    }
  }

  async bootstrapRecoveryRunTx(
    tenantId: string,
    sourceRunId: string,
    buildInput: RecoveryRunBootstrapFactory
  ): Promise<RecoveryRunBootstrapResult> {
    const sourceMetadata = this.metadataByRunId.get(sourceRunId);
    if (!sourceMetadata || sourceMetadata.tenantId !== tenantId) {
      throw new RunNotFoundError(sourceRunId);
    }
    const originRunId = resolveRetryOriginRunId(sourceMetadata);

    return this.withRecoveryBootstrapLock(originRunId, async () => {
      const retryLineageCheckpoint = captureRetryLineageCheckpoint(
        this.nextRetryAttemptByOriginRunId,
        sourceMetadata
      );
      try {
        const reservation = await this.reserveRetryAttempt(tenantId, sourceRunId);
        const bootstrapInput = buildInput(reservation);
        const appendResult = await this.bootstrapRunTx(bootstrapInput);
        return { reservation, metadata: bootstrapInput.metadata, appendResult };
      } catch (error) {
        restoreRetryLineageCheckpoint(this.nextRetryAttemptByOriginRunId, retryLineageCheckpoint);
        throw error;
      }
    });
  }

  /**
   * Atomic in this in-memory implementation: outbox enqueue and event-state commit
   * happen as a single ordered mutation from the caller's perspective.
   */
  async appendAndEnqueueTx(runId: string, eventsToAppend: EventInput[]): Promise<AppendResult> {
    return this.withRunWriteLock(runId, () => this.appendUnlocked(runId, eventsToAppend));
  }

  private async appendUnlocked(runId: string, eventsToAppend: EventInput[]): Promise<AppendResult> {
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
  ): Promise<EventEnvelope[]> {
    return listInMemoryRunEvents(this, tenantId, runId, options?.afterSeq, options?.limit);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    return listInMemoryRuns(this, options);
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

  private async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: string
  ): Promise<RetryAttemptReservation> {
    return reserveInMemoryRetryAttempt(this, tenantId, sourceRunId);
  }

  private async withRunWriteLock<T>(runId: string, write: () => Promise<T>): Promise<T> {
    const previous = this.runWriteTails.get(runId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.runWriteTails.set(runId, current);
    await previous;
    try {
      return await write();
    } finally {
      release();
      if (this.runWriteTails.get(runId) === current) this.runWriteTails.delete(runId);
    }
  }

  private async withRecoveryBootstrapLock<T>(
    originRunId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const previousTail =
      this.recoveryBootstrapTailByOriginRunId.get(originRunId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const nextTail = previousTail.then(() => current);
    this.recoveryBootstrapTailByOriginRunId.set(originRunId, nextTail);

    await previousTail;
    try {
      return await operation();
    } finally {
      release();
      if (this.recoveryBootstrapTailByOriginRunId.get(originRunId) === nextTail) {
        this.recoveryBootstrapTailByOriginRunId.delete(originRunId);
      }
    }
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
    eventsToAppend: readonly EventInput[]
  ): PlannedInMemoryAppend {
    const idempotencyIndex = new Map<string, EventEnvelope>(this.idempIndexByRunId.get(runId));
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];

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
    appended: readonly EventEnvelope[]
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
  event: EventInput,
  index: number
): EventEnvelope {
  const runSeq = baseRunSeq + appendedCount + 1;
  assertRunSequenceWithinSafeRange(runSeq, runId);
  return buildPersistedRunEventRecord(event, runSeq, IN_MEMORY_PERSISTED_AT_EPOCH_ISO, index);
}
