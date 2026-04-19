/**
 * @baseline ADR-0003
 */
import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
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

import { InMemoryRunStateCore } from './InMemoryRunStateCore.js';

export class InMemoryRunStateStore implements IRunStateStore, IRunSnapshotStalenessQuery {
  private readonly runState = new InMemoryRunStateCore();

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

  appendAndEnqueueTx(runId: string, eventsToAppend: RunEventInput[]): Promise<AppendResult> {
    return this.runState.appendAndEnqueueTx(runId, eventsToAppend);
  }

  listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<RunEventPersisted[]> {
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

  reserveRetryAttempt(tenantId: string, sourceRunId: string): Promise<RetryAttemptReservation> {
    return this.runState.reserveRetryAttempt(tenantId, sourceRunId);
  }
}
