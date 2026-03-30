import type { RunMetadata } from './IRunStateStore.v1.js';

/**
 * Dedicated query port for snapshot projection catch-up workers.
 *
 * This is a read-only boundary separate from maintenance/repair writes.
 */
export interface IRunSnapshotStalenessQuery {
  /**
   * Returns whether the snapshot projection for a run is stale.
   *
   * A snapshot is stale when `run_snapshots.last_run_seq` is less than the
   * maximum `run_seq` in `run_events` for that run, or when no snapshot row
   * exists but at least one event exists.
   */
  isSnapshotStale(tenantId: string, runId: string): Promise<boolean>;

  /**
   * Returns up to `batchSize` runs that have a missing or stale snapshot.
   *
   * A snapshot is stale when `run_snapshots.last_run_seq` is less than the
   * maximum `run_seq` in `run_events` for that run, or when no snapshot row
   * exists and at least one event exists.
   */
  listStaleSnapshotRuns(batchSize: number): Promise<Array<{ runId: string; tenantId: string }>>;
}

export type RunSnapshotStalenessCandidate = Pick<RunMetadata, 'runId' | 'tenantId' | 'createdAt'>;
