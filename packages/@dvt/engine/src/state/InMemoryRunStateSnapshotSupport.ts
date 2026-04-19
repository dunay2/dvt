/**
 * @baseline ADR-0003
 */
import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION } from '@dvt/contracts';

import { RunNotFoundError } from '../contracts/errors.js';
import type { RunEventPersisted, RunMetadata, WorkflowSnapshot } from '../contracts/runEvents.js';
import { applyRunEvent } from '../core/SnapshotProjector.js';

import { cloneWorkflowSnapshot, createDefaultWorkflowSnapshot } from './runEventWritePolicy.js';
import { collectStaleSnapshotRuns, isSnapshotProjectionStale } from './snapshotStaleness.js';

export type InMemoryRunStateSnapshotBacking = {
  metadataByRunId: Map<string, RunMetadata>;
  eventsByRunId: Map<string, RunEventPersisted[]>;
  snapshotByRunId: Map<string, WorkflowSnapshot>;
  snapshotLastRunSeqByRunId: Map<string, number>;
};

export function getInMemorySnapshot(
  backing: InMemoryRunStateSnapshotBacking,
  tenantId: string,
  runId: string
): WorkflowSnapshot | null {
  const meta = backing.metadataByRunId.get(runId);
  if (meta?.tenantId !== tenantId) return null;
  return backing.snapshotByRunId.get(runId) ?? null;
}

export function rebuildInMemorySnapshot(
  backing: InMemoryRunStateSnapshotBacking,
  tenantId: string,
  runId: string
): WorkflowSnapshot {
  const meta = backing.metadataByRunId.get(runId);
  if (meta?.tenantId !== tenantId) {
    throw new RunNotFoundError(runId);
  }

  const events = (backing.eventsByRunId.get(runId) ?? [])
    .slice()
    .sort((a, b) => a.runSeq - b.runSeq);
  const latestRunSeq = events.at(-1)?.runSeq ?? 0;
  const persistedSnapshot = backing.snapshotByRunId.get(runId);
  const persistedLastRunSeq = backing.snapshotLastRunSeqByRunId.get(runId) ?? 0;
  const canUseIncrementalCheckpoint =
    persistedSnapshot !== undefined &&
    persistedSnapshot.schemaVersion === CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION &&
    persistedLastRunSeq >= 0 &&
    persistedLastRunSeq <= latestRunSeq;

  const snapshot = canUseIncrementalCheckpoint
    ? cloneWorkflowSnapshot(persistedSnapshot)
    : createDefaultWorkflowSnapshot(runId);
  const replayFromRunSeq = canUseIncrementalCheckpoint ? persistedLastRunSeq : 0;
  for (const event of events) {
    if (event.runSeq <= replayFromRunSeq) {
      continue;
    }
    applyRunEvent(snapshot, event);
  }

  backing.snapshotByRunId.set(runId, snapshot);
  backing.snapshotLastRunSeqByRunId.set(runId, latestRunSeq);
  return snapshot;
}

export function listInMemoryStaleSnapshotRuns(
  backing: InMemoryRunStateSnapshotBacking,
  batchSize: number
): Array<{ runId: string; tenantId: string }> {
  return collectStaleSnapshotRuns(
    backing.metadataByRunId.values(),
    (runId) => backing.snapshotLastRunSeqByRunId.get(runId),
    (runId) => backing.eventsByRunId.get(runId)?.at(-1)?.runSeq ?? 0,
    batchSize
  );
}

export function isInMemorySnapshotStale(
  backing: InMemoryRunStateSnapshotBacking,
  tenantId: string,
  runId: string
): boolean {
  const metadata = backing.metadataByRunId.get(runId);
  if (!metadata || metadata.tenantId !== tenantId) {
    return false;
  }

  return isSnapshotProjectionStale(
    () => backing.snapshotLastRunSeqByRunId.get(runId),
    () => backing.eventsByRunId.get(runId)?.at(-1)?.runSeq ?? 0
  );
}
