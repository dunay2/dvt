import type { RunMetadata } from '../contracts/runEvents.js';

export function collectStaleSnapshotRuns(
  runs: Iterable<RunMetadata>,
  getSnapshotLastRunSeq: (runId: string) => number | undefined,
  getLatestRunSeq: (runId: string) => number,
  batchSize: number
): Array<{ runId: string; tenantId: string }> {
  const toSortKey = (value: string | undefined): number => {
    if (value === undefined) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return Array.from(runs)
    .filter((meta) => {
      const snapshotLastRunSeq = getSnapshotLastRunSeq(meta.runId);
      if (snapshotLastRunSeq === undefined) return getLatestRunSeq(meta.runId) > 0;
      return snapshotLastRunSeq < getLatestRunSeq(meta.runId);
    })
    .sort((left, right) => {
      const leftKey = toSortKey(left.createdAt);
      const rightKey = toSortKey(right.createdAt);
      return leftKey - rightKey || left.runId.localeCompare(right.runId);
    })
    .slice(0, batchSize)
    .map((meta) => ({
      runId: meta.runId,
      tenantId: meta.tenantId,
    }));
}

export function isSnapshotProjectionStale(
  getSnapshotLastRunSeq: () => number | undefined,
  getLatestRunSeq: () => number
): boolean {
  const snapshotLastRunSeq = getSnapshotLastRunSeq();
  if (snapshotLastRunSeq === undefined) {
    return getLatestRunSeq() > 0;
  }
  return snapshotLastRunSeq < getLatestRunSeq();
}
