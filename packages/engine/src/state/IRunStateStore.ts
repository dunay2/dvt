import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';

export interface RunBootstrapInput {
  metadata: RunMetadata;
  firstEvents: RunEventInput[];
}

export interface ListRunsOptions {
  /** Filter to a single tenant. */
  tenantId?: string;
  /** Maximum records to return (default: 50). */
  limit?: number;
}

export interface IRunStateStore {
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: RunEventInput[]): Promise<AppendResult>;

  getRunMetadataByRunId(runId: string): Promise<RunMetadata | null>;
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
  listEvents(runId: string): Promise<RunEventPersisted[]>;

  /**
   * Returns run metadata records, most-recently created first.
   * Useful for dashboard / admin listing — does not include run status.
   */
  listRuns(options?: ListRunsOptions): Promise<RunMetadata[]>;

  /**
   * Returns the latest materialized WorkflowSnapshot for the run, or null if
   * no snapshot exists yet (run predates snapshot support, or store crashed
   * between event commit and snapshot upsert).
   *
   * Callers MUST fall back to full event replay when null is returned.
   */
  getSnapshot(runId: string): Promise<WorkflowSnapshot | null>;
}
