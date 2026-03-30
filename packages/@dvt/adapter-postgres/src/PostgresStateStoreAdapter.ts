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

import { POSTGRES_ADAPTER_ERROR_CONSTANTS as E } from './PostgresAdapterConstants.js';
import type { PostgresSchemaRollbackPlan } from './PostgresSchemaManager.js';
import { PostgresStateStoreRuntime } from './PostgresStateStoreRuntime.js';
import type { PostgresStateStoreRuntimeConfig } from './PostgresStateStoreRuntimeConfig.js';
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

export class PostgresStateStoreAdapter
  extends PostgresStateStoreRuntime
  implements IRunStateStore, IRunSnapshotStalenessQuery, IOutboxStorage
{
  constructor(config: PostgresStateStoreRuntimeConfig = {}) {
    super(config);
  }

  async migrate(): Promise<void> {
    return this.schemaManager.migrate();
  }

  async planSchemaRollback(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    return this.schemaManager.planRollback(targetVersion);
  }

  async rollbackSchemaTo(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    return this.clientSession.withMaintenanceMode(async () => {
      if (this.clientSession.hasActiveClients()) {
        throw new Error(E.schemaRollbackActiveClientsErrorMessage);
      }
      return this.schemaManager.rollbackTo(targetVersion);
    });
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
    return this.appendAndEnqueueTxInternal(runId, envelopes);
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    this.ready();
    return this.bootstrapRunTxInternal(input);
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
    return this.saveProviderRefInternal(tenantId, runId, runRef);
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    this.ready();
    return this.getRunMetadataByRunIdInternal(tenantId, runId);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    this.ready();
    return this.listRunsInternal(options);
  }

  async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: RunId
  ): Promise<RetryAttemptReservation> {
    this.ready();
    return this.reserveRetryAttemptInternal(tenantId, sourceRunId);
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<EventEnvelope[]> {
    this.ready();
    return this.listEventsInternal(tenantId, runId, options);
  }

  async getSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot | null> {
    this.ready();
    return this.getSnapshotInternal(tenantId, runId);
  }

  async pinTerminalSnapshot(
    snapshot: ArchivedTerminalSnapshot
  ): Promise<TerminalSnapshotPinResult> {
    this.ready();
    return this.pinTerminalSnapshotInternal(snapshot);
  }

  async getPinnedTerminalSnapshot(
    tenantId: string,
    runId: RunId
  ): Promise<ArchivedTerminalSnapshot | null> {
    this.ready();
    return this.getPinnedTerminalSnapshotInternal(tenantId, runId);
  }

  async rebuildSnapshot(tenantId: string, runId: RunId): Promise<WorkflowSnapshot> {
    this.ready();
    return this.rebuildSnapshotInternal(tenantId, runId);
  }

  async listStaleSnapshotRuns(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string }>> {
    this.ready();
    return this.listStaleSnapshotRunsInternal(batchSize);
  }

  async isSnapshotStale(tenantId: string, runId: RunId): Promise<boolean> {
    this.ready();
    return this.isSnapshotStaleInternal(tenantId, runId);
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    this.ready();
    await this.enqueueTxInternal(runId, events);
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    this.ready();
    return this.listPendingInternal(limit);
  }

  async listPendingForClaim(
    limit: number,
    selection?: { shardIds?: readonly number[] }
  ): Promise<OutboxRecord[]> {
    this.ready();
    return this.listPendingForClaimInternal(limit, selection);
  }

  async markDelivered(ids: string[]): Promise<void> {
    this.ready();
    return this.markDeliveredInternal(ids);
  }

  async markFailed(id: string, error: string): Promise<void> {
    this.ready();
    return this.markFailedInternal(id, error);
  }

  async hasPendingRetries(selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    this.ready();
    return this.hasPendingRetriesInternal(selection);
  }

  async listDeadLetter(limit: number, tenantId: string): Promise<DeadLetterRecord[]> {
    this.ready();
    return this.listDeadLetterInternal(limit, tenantId);
  }

  getLineageOutboxStore(): ILineageOutboxStore {
    this.ready();
    return this.getLineageOutboxStoreInternal();
  }

  async replayDeadLetters(options: {
    tenantId: string;
    limit?: number;
    runId?: string;
    ids?: string[];
  }): Promise<number> {
    this.ready();
    return this.replayDeadLettersInternal(options);
  }
}
