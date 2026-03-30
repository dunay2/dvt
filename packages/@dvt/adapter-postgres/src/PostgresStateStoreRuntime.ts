/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Section 2.1 - Append-only event persistence with monotonic sequence semantics
 * @decision Section 2.2 - Read model snapshot projection derived from persisted event stream
 * @decision All adapter methods enforce tenant scope per ADR-0031
 * @consequence PostgreSQL adapter preserves deterministic replay and transactional state consistency
 * @consequence Cross-tenant reads/writes are blocked at the adapter boundary
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { ILineageOutboxStore } from '@dvt/contracts';
import type { ArchivedTerminalSnapshot, TerminalSnapshotPinResult } from '@dvt/state-store';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { PostgresLineageOutboxStore } from './PostgresLineageOutboxStore.js';
import { PostgresOutboxStore } from './PostgresOutboxStore.js';
import { PostgresRunMetadataRepository } from './PostgresRunMetadataRepository.js';
import { PostgresRunSnapshotStore } from './PostgresRunSnapshotStore.js';
import { PostgresRunStateCoordinator } from './PostgresRunStateCoordinator.js';
import { PostgresSchemaManager } from './PostgresSchemaManager.js';
import { PostgresSnapshotStalenessQuery } from './PostgresSnapshotStalenessQuery.js';
import { PostgresSnapshotWorkQueue } from './PostgresSnapshotWorkQueue.js';
import { composePostgresStateStoreRuntime } from './PostgresStateStoreRuntimeComposer.js';
import type { PostgresStateStoreRuntimeConfig } from './PostgresStateStoreRuntimeConfig.js';
import type { RunEventReadRepository, RunEventWriteRepository } from './RunEventWriteRepository.js';
import type {
  AppendResult,
  DeadLetterRecord,
  EventEnvelope,
  EventInput,
  ListEventsOptions,
  ListRunsOptions,
  OutboxRecord,
  RetryAttemptReservation,
  RunBootstrapInput,
  RunId,
  RunMetadata,
  WorkflowSnapshot,
} from './types.js';

/**
 * Runtime composition base for the Postgres state-store adapter.
 *
 * This class owns resource lifecycle and internal adapter component wiring.
 * Concrete facade adapters delegate to protected methods and avoid direct
 * dependency on the concrete repositories/stores.
 */
export class PostgresStateStoreRuntime {
  private readonly ownsPool: boolean;
  protected readonly clientSession: PostgresAdapterClientSession;
  protected readonly schemaManager: PostgresSchemaManager;
  private readonly outboxStore: PostgresOutboxStore;
  private readonly metadataRepo: PostgresRunMetadataRepository;
  private readonly runEventRepository: RunEventWriteRepository & RunEventReadRepository;
  private readonly snapshotStore: PostgresRunSnapshotStore;
  private readonly runStateCoordinator: PostgresRunStateCoordinator;
  private readonly snapshotStalenessQuery: PostgresSnapshotStalenessQuery;
  private readonly snapshotWorkQueue: PostgresSnapshotWorkQueue;
  private readonly lineageOutboxStore: PostgresLineageOutboxStore;

  constructor(readonly config: PostgresStateStoreRuntimeConfig = {}) {
    const services = composePostgresStateStoreRuntime(config);
    this.ownsPool = services.ownsPool;
    this.clientSession = services.clientSession;
    this.schemaManager = services.schemaManager;
    this.outboxStore = services.outboxStore;
    this.metadataRepo = services.metadataRepo;
    this.runEventRepository = services.runEventRepository;
    this.snapshotStore = services.snapshotStore;
    this.runStateCoordinator = services.runStateCoordinator;
    this.snapshotStalenessQuery = services.snapshotStalenessQuery;
    this.snapshotWorkQueue = services.snapshotWorkQueue;
    this.lineageOutboxStore = services.lineageOutboxStore;
  }

  /** Closes active clients and the owned pool when this runtime created it. */
  async close(): Promise<void> {
    await this.clientSession.close(this.ownsPool);
  }

  abortPendingOperations(): void {
    this.clientSession.abortPendingOperations();
  }

  protected async appendAndEnqueueTxInternal(
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendResult> {
    return this.runStateCoordinator.appendAndEnqueueTx(runId, envelopes);
  }

  protected async bootstrapRunTxInternal(input: RunBootstrapInput): Promise<AppendResult> {
    return this.runStateCoordinator.bootstrapRunTx(input);
  }

  protected async saveProviderRefInternal(
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
    return this.metadataRepo.saveProviderRef(tenantId, runId, runRef);
  }

  protected async getRunMetadataByRunIdInternal(
    tenantId: string,
    runId: string
  ): Promise<RunMetadata | null> {
    return this.metadataRepo.getByRunId(tenantId, runId);
  }

  protected async listRunsInternal(options: ListRunsOptions): Promise<RunMetadata[]> {
    return this.metadataRepo.listRuns(options);
  }

  protected async reserveRetryAttemptInternal(
    tenantId: string,
    sourceRunId: RunId
  ): Promise<RetryAttemptReservation> {
    return this.metadataRepo.reserveRetryAttempt(tenantId, sourceRunId);
  }

  protected async listEventsInternal(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]> {
    return this.runEventRepository.listEvents(tenantId, runId, options);
  }

  protected async getSnapshotInternal(
    tenantId: string,
    runId: RunId
  ): Promise<WorkflowSnapshot | null> {
    return this.snapshotStore.getSnapshot(tenantId, runId);
  }

  protected async pinTerminalSnapshotInternal(
    snapshot: ArchivedTerminalSnapshot
  ): Promise<TerminalSnapshotPinResult> {
    return this.snapshotStore.pinTerminalSnapshot(snapshot);
  }

  protected async getPinnedTerminalSnapshotInternal(
    tenantId: string,
    runId: RunId
  ): Promise<ArchivedTerminalSnapshot | null> {
    return this.snapshotStore.getPinnedTerminalSnapshot(tenantId, runId);
  }

  protected async rebuildSnapshotInternal(
    tenantId: string,
    runId: RunId
  ): Promise<WorkflowSnapshot> {
    return this.snapshotStore.rebuildSnapshot(tenantId, runId);
  }

  protected async listStaleSnapshotRunsInternal(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    return this.snapshotStalenessQuery.listStaleSnapshotRuns(batchSize);
  }

  protected async isSnapshotStaleInternal(tenantId: string, runId: string): Promise<boolean> {
    return this.snapshotStalenessQuery.isSnapshotStale(tenantId, runId);
  }

  protected async claimSnapshotWorkInternal(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    return this.snapshotWorkQueue.claimSnapshotWork(batchSize);
  }

  protected async completeSnapshotWorkInternal(tenantId: string, runId: string): Promise<void> {
    await this.snapshotWorkQueue.completeSnapshotWork(tenantId, runId);
  }

  protected async failSnapshotWorkInternal(
    tenantId: string,
    runId: string,
    retryDelayMs: number
  ): Promise<void> {
    await this.snapshotWorkQueue.failSnapshotWork(tenantId, runId, retryDelayMs);
  }

  protected async enqueueTxInternal(runId: RunId, events: EventEnvelope[]): Promise<void> {
    await this.runStateCoordinator.enqueueTx(runId, events);
  }

  protected async listPendingInternal(limit: number): Promise<OutboxRecord[]> {
    return this.outboxStore.listPending(limit);
  }

  protected async listPendingForClaimInternal(
    limit: number,
    selection?: { shardIds?: readonly number[] }
  ): Promise<OutboxRecord[]> {
    return this.outboxStore.listPendingForClaim(limit, selection);
  }

  protected async markDeliveredInternal(ids: string[]): Promise<void> {
    return this.outboxStore.markDelivered(ids);
  }

  protected async markFailedInternal(id: string, error: string): Promise<void> {
    return this.outboxStore.markFailed(id, error);
  }

  protected async hasPendingRetriesInternal(selection?: {
    shardIds?: readonly number[];
  }): Promise<boolean> {
    return this.outboxStore.hasPendingRetries(selection);
  }

  protected async listDeadLetterInternal(
    limit: number,
    tenantId: string
  ): Promise<DeadLetterRecord[]> {
    return this.outboxStore.listDeadLetter(limit, tenantId);
  }

  protected getLineageOutboxStoreInternal(): ILineageOutboxStore {
    return this.lineageOutboxStore;
  }

  protected async replayDeadLettersInternal(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    return this.outboxStore.replayDeadLetters(options);
  }

  protected ready(): void {
    this.schemaManager.ready();
  }
}
