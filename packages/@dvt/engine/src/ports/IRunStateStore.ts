/**
 * @baseline ADR-0003
 */
import type { TenantId } from '@dvt/contracts';

import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';
import type { RunStatus } from '../contracts/types.js';

export interface RunBootstrapInput {
  metadata: RunMetadata;
  firstEvents: RunEventInput[];
}

export interface ListRunsOptions {
  /** Tenant scope is mandatory to prevent cross-tenant leaks. */
  tenantId: TenantId;
  /** Maximum records to return (default: 50). */
  limit?: number;
  /**
   * Filter by snapshot status. Only returns runs whose materialized snapshot
   * matches this status. Implementations without snapshot access may ignore this field.
   */
  status?: RunStatus;
}

export interface ListEventsOptions {
  /**
   * Keyset cursor: return only events with run_seq strictly greater than this value.
   * Omit to start from the beginning.
   */
  afterSeq?: number;
  /**
   * Maximum events to return in this page.
   * Omit for no limit (full scan). Only safe on recovery/rebuild paths where
   * getSnapshot() returned null. The hot read path MUST use getSnapshot() instead.
   */
  limit?: number;
}

export interface IRunStateStore {
  bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult>;
  appendAndEnqueueTx(runId: string, events: RunEventInput[]): Promise<AppendResult>;

  getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null>;

  /**
   * Returns persisted events ordered by run_seq ASC.
   * WARNING: Omitting options.limit is a full table scan. Only call from
   * recovery/rebuild paths (snapshot unavailable). Hot path: use getSnapshot().
   */
  listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<RunEventPersisted[]>;

  /**
   * Returns run metadata records, most-recently created first.
   * Useful for dashboard / admin listing — does not include run status.
   */
  listRuns(options: ListRunsOptions): Promise<RunMetadata[]>;

  /**
   * Returns the latest materialized WorkflowSnapshot for the run, or null if
   * no snapshot exists yet (run predates snapshot support, or store crashed
   * between event commit and snapshot upsert).
   *
   * Callers MUST fall back to full event replay when null is returned.
   */
  getSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot | null>;
}
