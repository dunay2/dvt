/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunStateStoreAdapter.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Run-state contract delegation is isolated from snapshot-queue and delivery concerns
 * @consequence Postgres state-store facade stays aligned with DDD-style responsibility slices
 * @version 1.0.0
 * @date 2026-04-19
 */
import type { ArchivedTerminalSnapshot, TerminalSnapshotPinResult } from '@dvt/state-store';

import { PostgresStateStoreAdminAdapter } from './PostgresStateStoreAdminAdapter.js';
import type {
  AppendResult,
  EventEnvelope,
  EventInput,
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RetryAttemptReservation,
  RunBootstrapInput,
  RunId,
  RunMetadata,
  WorkflowSnapshot,
} from './types.js';

export class PostgresRunStateStoreAdapter
  extends PostgresStateStoreAdminAdapter
  implements IRunStateStore
{
  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    this.ready();
    return this.appendAndEnqueueTxInternal(runId, envelopes);
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    this.ready();
    return this.bootstrapRunTxInternal(input);
  }

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    this.ready();
    return this.getRunMetadataByRunIdInternal(tenantId, runId);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    this.ready();
    return this.listRunsInternal(options);
  }

  async saveProviderRef(
    tenantId: string,
    runId: RunId,
    providerRef: RunMetadata['providerRef']
  ): Promise<RunMetadata> {
    this.ready();
    return this.saveProviderRefInternal(tenantId, runId, providerRef);
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
}
