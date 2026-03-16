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

  /**
   * Replays all persisted events for the run from the beginning and overwrites
   * the materialized snapshot with the result.
   *
   * Use for recovery/repair when the snapshot is known to be stale, missing,
   * or corrupt. This is a write operation — the caller must own the intent to
   * mutate persisted read-model state.
   *
   * ADR-0004 §2.2: runSeq is the authority for event ordering; replay MUST
   * consume events ordered by runSeq ASC.
   * ADR-0031: tenant isolation enforced — throws an error when the run does
   * not belong to the given tenantId.
   *
   * @throws Error with message `RUN_NOT_FOUND: <runId>` when the run does not
   *   exist or belongs to a different tenant.
   */
  rebuildSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot>;

  /**
   * Returns up to `batchSize` runs that have a missing or stale snapshot.
   *
   * A snapshot is stale when `run_snapshots.last_run_seq` is less than the
   * maximum `run_seq` in `run_events` for that run, or when no snapshot row
   * exists at all.
   *
   * Used by the standalone projector worker (G7.2) to drive a catch-up loop.
   * Optional - implementations that do not support this query may omit it;
   * the projector worker will skip the tick when the method is absent.
   */
  listStaleSnapshotRuns?(batchSize: number): Promise<Array<{ runId: string; tenantId: string }>>;
}
