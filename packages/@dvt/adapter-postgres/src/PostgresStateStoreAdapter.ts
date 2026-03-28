/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Runtime owns wiring/lifecycle and the facade owns contract delegation
 * @consequence Runtime composition is separated from state-store contract behavior
 * @version 1.0.0
 * @date 2026-03-28
 */
import type { ILineageOutboxStore } from '@dvt/contracts';
import type { ArchivedTerminalSnapshot, TerminalSnapshotPinResult } from '@dvt/state-store';

import {
  PostgresStateStoreRuntime,
  type PostgresStateStoreRuntimeConfig,
} from './PostgresStateStoreRuntime.js';
import type {
  AppendResult,
  DeadLetterRecord,
  EventEnvelope,
  EventInput,
  IOutboxStorage,
  IRunSnapshotStalenessQuery,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  OutboxRecord,
  RetryAttemptReservation,
  RunBootstrapInput,
  RunId,
  RunMetadata,
  WorkflowSnapshot,
} from './types.js';

export type PostgresAdapterConfig = PostgresStateStoreRuntimeConfig;

export class PostgresStateStoreAdapter
  extends PostgresStateStoreRuntime
  implements IRunStateStore, IRunSnapshotStalenessQuery, IOutboxStorage
{
  constructor(config: PostgresAdapterConfig = {}) {
    super(config);
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
    return this.runStateCoordinator.appendAndEnqueueTx(runId, envelopes);
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    this.ready();
    return this.runStateCoordinator.bootstrapRunTx(input);
  }

  async saveProviderRef(
    tenantId: string,
    runId: RunId,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    this.ready();
    return this.metadataRepo.saveProviderRef(tenantId, runId, runRef);
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    this.ready();
    return this.metadataRepo.getByRunId(tenantId, runId);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    this.ready();
    return this.metadataRepo.listRuns(options);
  }

  async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: RunId
  ): Promise<RetryAttemptReservation> {
    this.ready();
    return this.metadataRepo.reserveRetryAttempt(tenantId, sourceRunId);
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]> {
    this.ready();
    return this.runEventRepository.listEvents(tenantId, runId, options);
  }

  async getSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot | null> {
    this.ready();
    return this.snapshotStore.getSnapshot(tenantId, runId);
  }

  async pinTerminalSnapshot(
    snapshot: ArchivedTerminalSnapshot
  ): Promise<TerminalSnapshotPinResult> {
    this.ready();
    return this.snapshotStore.pinTerminalSnapshot(snapshot);
  }

  async getPinnedTerminalSnapshot(
    tenantId: string,
    runId: RunId
  ): Promise<ArchivedTerminalSnapshot | null> {
    this.ready();
    return this.snapshotStore.getPinnedTerminalSnapshot(tenantId, runId);
  }

  async rebuildSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot> {
    this.ready();
    return this.snapshotStore.rebuildSnapshot(tenantId, runId);
  }

  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    this.ready();
    return this.snapshotStalenessQuery.listStaleSnapshotRuns(batchSize);
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    this.ready();
    await this.runStateCoordinator.enqueueTx(runId, events);
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    this.ready();
    return this.outboxStore.listPending(limit);
  }

  async listPendingForClaim(
    limit: number,
    selection?: { shardIds?: readonly number[] }
  ): Promise<OutboxRecord[]> {
    this.ready();
    return this.outboxStore.listPendingForClaim(limit, selection);
  }

  async markDelivered(ids: string[]): Promise<void> {
    this.ready();
    return this.outboxStore.markDelivered(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    this.ready();
    return this.outboxStore.markFailed(id, error);
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    this.ready();
    return this.outboxStore.hasPendingRetries(selection);
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    this.ready();
    return this.outboxStore.listDeadLetter(limit, tenantId);
  }

  getLineageOutboxStore(): ILineageOutboxStore {
    this.ready();
    return this.lineageOutboxStore;
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    this.ready();
    return this.outboxStore.replayDeadLetters(options);
  }
}
