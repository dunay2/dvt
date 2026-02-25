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
import type { DeadLetterRecord, IOutboxStorage, OutboxRecord } from '../outbox/types.js';
import type { IRunStateStore, ListRunsOptions, RunBootstrapInput } from './IRunStateStore.js';
export declare class InMemoryTxStore implements IRunStateStore, IOutboxStorage {
  private static readonly EPOCH_ISO;
  private readonly metadataByRunId;
  private readonly eventsByRunId;
  private readonly idempIndexByRunId;
  private readonly snapshotByRunId;
  private readonly pending;
  private readonly deadLetters;
  private outboxCounter;
  private createDefaultSnapshot;
  private assertRunExists;
  private assertEventInput;
  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
  /**
   * @deprecated Use bootstrapRunTx. This bypasses the atomicity guarantee that
   * metadata + first events are written together. Scheduled for removal in Phase 3.
   */
  saveRunMetadata(meta: RunMetadata): Promise<void>;
  saveProviderRef(
    runId: string,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void>;
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  /**
   * Atomic in this in-memory implementation: assigning runSeq, appending, and enqueueing to outbox
   * happen as a single synchronous mutation (no awaits in the critical section).
   *
   * Note: this atomicity guarantee is process-local and only applies to this in-memory store.
   */
  appendAndEnqueueTx(runId: string, eventsToAppend: RunEventInput[]): Promise<AppendResult>;
  /**
   * @deprecated Use appendAndEnqueueTx. Scheduled for removal in Phase 3.
   * In this store the two are equivalent, but in Postgres appendEventsTx
   * skips the outbox enqueue — a correctness hazard.
   */
  appendEventsTx(runId: string, envelopes: RunEventInput[]): Promise<AppendResult>;
  listEvents(runId: string): Promise<RunEventPersisted[]>;
  listRuns(options?: ListRunsOptions): Promise<RunMetadata[]>;
  getSnapshot(runId: string): Promise<WorkflowSnapshot | null>;
  enqueueTx(_runId: string, _events: RunEventPersisted[]): Promise<void>;
  listPending(limit: number): Promise<OutboxRecord[]>;
  markDelivered(ids: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  listDeadLetter(limit: number): Promise<DeadLetterRecord[]>;
}
//# sourceMappingURL=InMemoryTxStore.d.ts.map
