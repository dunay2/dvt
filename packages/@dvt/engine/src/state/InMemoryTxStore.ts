/**
 * @baseline ADR-0003
 */
import type { DeadLetterRecord, OutboxRecord } from '@dvt/contracts';
import type { IOutboxStorage, OutboxClaimSelection } from '@dvt/delivery';

import type {
  AppendResult,
  EventEnvelope,
  EventInput,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';
import type { IRunSnapshotStalenessQuery } from '../ports/IRunSnapshotStalenessQuery.js';
import type {
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RetryAttemptReservation,
  RunBootstrapInput,
} from '../ports/IRunStateStore.js';

import { InMemoryOutboxState } from './InMemoryOutboxState.js';
import { InMemoryRunStateCore } from './InMemoryRunStateCore.js';

export class InMemoryTxStore implements IRunStateStore, IRunSnapshotStalenessQuery, IOutboxStorage {
  private readonly runState: InMemoryRunStateCore;
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
    this.runState = new InMemoryRunStateCore({
      commitOutbox: (runId, events) => this.outbox.enqueueTx(runId, events),
    });
  }

  getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    return this.runState.getRunMetadataByRunId(tenantId, runId);
  }

  saveProviderRef(
    tenantId: string,
    runId: string,
    providerRef: RunMetadata['providerRef']
  ): Promise<RunMetadata> {
    return this.runState.saveProviderRef(tenantId, runId, providerRef);
  }

  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    return this.runState.bootstrapRunTx(input);
  }

  appendAndEnqueueTx(runId: string, eventsToAppend: EventInput[]): Promise<AppendResult> {
    return this.runState.appendAndEnqueueTx(runId, eventsToAppend);
  }

  listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]> {
    return this.runState.listEvents(tenantId, runId, options);
  }

  listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    return this.runState.listRuns(options);
  }

  getSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot | null> {
    return this.runState.getSnapshot(tenantId, runId);
  }

  rebuildSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot> {
    return this.runState.rebuildSnapshot(tenantId, runId);
  }

  listStaleSnapshotRuns(batchSize: number): Promise<Array<{ runId: string; tenantId: string }>> {
    return this.runState.listStaleSnapshotRuns(batchSize);
  }

  isSnapshotStale(tenantId: string, runId: string): Promise<boolean> {
    return this.runState.isSnapshotStale(tenantId, runId);
  }

  async enqueueTx(_runId: string, _events: EventEnvelope[]): Promise<void> {
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

  async replayDeadLetters(
    options: Parameters<IOutboxStorage['replayDeadLetters']>[0]
  ): Promise<number> {
    return this.outbox.replayDeadLetters(options);
  }

  reserveRetryAttempt(tenantId: string, sourceRunId: string): Promise<RetryAttemptReservation> {
    return this.runState.reserveRetryAttempt(tenantId, sourceRunId);
  }
}
