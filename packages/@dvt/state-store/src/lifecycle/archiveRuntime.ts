import type { EventEnvelope, RunId, WorkflowSnapshot } from '@dvt/contracts';

import type { ArchiveUnitState } from '../archiveLifecycle.js';

import type { ArchivedTerminalSnapshot, TerminalSnapshotPinStore } from './archiveArtifacts.js';

export interface RunEventRetentionPolicy {
  readonly hotRetentionDays: number;
  readonly archiveBucketCount: number;
  readonly pinTerminalSnapshots: boolean;
}

export type ArchiveBatchStatus = 'STARTED' | 'EXPORTED' | 'FAILED' | 'VERIFIED' | 'VERIFY_FAILED';

export interface EligibleArchiveUnit {
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly tenantIds: readonly string[];
  readonly rowCount: number;
  readonly minRunSeq: number;
  readonly maxRunSeq: number;
  readonly state: Extract<ArchiveUnitState, 'ELIGIBLE'>;
}

export interface ArchiveBatchRecord {
  readonly batchId: string;
  readonly archiveUnitKey: string;
  readonly startedAt: string;
  readonly status: Extract<ArchiveBatchStatus, 'STARTED'>;
}

export interface ArchiveUnitTerminalSnapshotCandidate {
  readonly tenantId: string;
  readonly runId: RunId;
  readonly snapshot: WorkflowSnapshot;
}

export interface ArchiveBatchExportedRecord {
  readonly batchId: string;
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly tenantIds: readonly string[];
  readonly rowCount: number;
  readonly minRunSeq: number;
  readonly maxRunSeq: number;
  readonly objectKey: string;
  readonly checksumSha256: string;
  readonly exportedAtIso: string;
}

export interface ArchiveBatchFailureRecord {
  readonly batchId: string;
  readonly archiveUnitKey: string;
  readonly failedAtIso: string;
  readonly error: string;
}

export interface PendingArchiveVerification {
  readonly batchId: string;
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly tenantIds: readonly string[];
  readonly rowCount: number;
  readonly minRunSeq: number;
  readonly maxRunSeq: number;
  readonly objectKey: string;
  readonly checksumSha256: string;
  readonly exportedAtIso: string;
}

export interface ArchiveBatchVerifiedRecord {
  readonly batchId: string;
  readonly archiveUnitKey: string;
  readonly verifiedAtIso: string;
}

export interface IRunArchiveStore extends TerminalSnapshotPinStore {
  listEligibleArchiveUnits(
    policy: RunEventRetentionPolicy,
    nowIso: string
  ): Promise<readonly EligibleArchiveUnit[]>;

  startArchiveBatch(archiveUnitKey: string, startedAtIso: string): Promise<ArchiveBatchRecord>;

  loadArchiveUnitEvents(archiveUnitKey: string): Promise<readonly EventEnvelope[]>;

  listTerminalSnapshotsForArchiveUnit(
    archiveUnitKey: string
  ): Promise<readonly ArchiveUnitTerminalSnapshotCandidate[]>;

  markArchiveBatchExported(record: ArchiveBatchExportedRecord): Promise<void>;

  markArchiveBatchFailed(record: ArchiveBatchFailureRecord): Promise<void>;

  listArchiveUnitsPendingVerification(
    limit?: number
  ): Promise<readonly PendingArchiveVerification[]>;

  markArchiveBatchVerified(record: ArchiveBatchVerifiedRecord): Promise<void>;

  markArchiveBatchVerifyFailed(record: ArchiveBatchFailureRecord): Promise<void>;
}

export interface ArchiveObjectWriteResult {
  readonly objectKey: string;
  readonly uri: string;
}

export interface IArchiveObjectStore {
  putObject(
    objectKey: string,
    content: Buffer,
    contentType: string
  ): Promise<ArchiveObjectWriteResult>;
  readObject(objectKey: string): Promise<Buffer>;
  existsObject(objectKey: string): Promise<boolean>;
  getObjectUri?(objectKey: string): string;
}

export interface ArchiveExportRequest {
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly exportedAtIso: string;
  readonly events: readonly EventEnvelope[];
}

export interface ArchiveExportedUnit {
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly tenantIds: readonly string[];
  readonly rowCount: number;
  readonly minRunSeq: number;
  readonly maxRunSeq: number;
  readonly objectKey: string;
  readonly objectUri: string;
  readonly manifestObjectKey: string;
  readonly checksumObjectKey: string;
  readonly checksumSha256: string;
  readonly manifestSha256: string;
  readonly exportedAtIso: string;
}

export interface ArchiveVerificationRequest {
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly expectedRowCount: number;
  readonly expectedChecksumSha256: string;
  readonly objectKey: string;
}

export interface IRunArchiveExporter {
  readonly archiveFormat: 'jsonl';
  readonly destinationKind: 'file' | 's3';

  exportArchiveUnit(input: ArchiveExportRequest): Promise<ArchiveExportedUnit>;
  verifyArchiveUnit(input: ArchiveVerificationRequest): Promise<void>;
}

export interface ArchiveLifecycleMetrics {
  addCounter(name: string, value: number): void;
  recordHistogram(name: string, value: number): void;
}

export interface ArchiveLifecycleLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface ArchiveLifecycleTelemetry {
  readonly metrics: ArchiveLifecycleMetrics;
  readonly logger: ArchiveLifecycleLogger;
}

class NoopArchiveLifecycleMetrics implements ArchiveLifecycleMetrics {
  addCounter(_name: string, _value: number): void {}
  recordHistogram(_name: string, _value: number): void {}
}

class NoopArchiveLifecycleLogger implements ArchiveLifecycleLogger {
  info(_data: Record<string, unknown>, _msg?: string): void {}
  warn(_data: Record<string, unknown>, _msg?: string): void {}
  error(_data: Record<string, unknown>, _msg?: string): void {}
}

export function createNoopArchiveLifecycleTelemetry(): ArchiveLifecycleTelemetry {
  return {
    metrics: new NoopArchiveLifecycleMetrics(),
    logger: new NoopArchiveLifecycleLogger(),
  };
}

export function toArchiveFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

// ---------------------------------------------------------------------------
// Delete lifecycle
// ---------------------------------------------------------------------------

export interface RunArchiveDeletionPolicy {
  readonly deletionGraceDays: number;
  readonly maxUnitsPerRun: number;
  readonly leaseTimeoutSeconds: number;
  readonly workerId: string;
}

export interface DeleteEligibleArchiveUnit {
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly tenantIds: readonly string[];
  readonly rowCount: number;
  readonly objectKey: string;
  readonly verifiedAtIso: string;
  readonly deleteAfterIso: string;
  readonly state: Extract<ArchiveUnitState, 'DELETE_ELIGIBLE'>;
}

export interface ArchiveBatchDroppedRecord {
  readonly batchId: string;
  readonly archiveUnitKey: string;
  readonly rowsDeleted: number;
  readonly droppedAtIso: string;
}

// ---------------------------------------------------------------------------
// Lease / fencing
// ---------------------------------------------------------------------------

export interface ArchiveLease {
  readonly workerId: string;
  readonly leaseToken: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

export interface IArchiveLeaseStore {
  /**
   * Try to acquire (or steal an expired) lease for `workerId`.
   * Returns the lease if acquired, null if another worker holds a live lease.
   */
  tryAcquire(workerId: string, ttlSeconds: number, nowIso: string): Promise<ArchiveLease | null>;

  /**
   * Renew an existing lease. Returns true if the lease was renewed, false if
   * it was stolen or expired since it was acquired.
   */
  renew(lease: ArchiveLease, ttlSeconds: number, nowIso: string): Promise<boolean>;

  /** Release the lease unconditionally. */
  release(lease: ArchiveLease): Promise<void>;

  /**
   * Assert that this worker's lease token is still valid before a destructive
   * operation. Throws ARCHIVE_LEASE_LOST if the lease is gone or expired.
   */
  assertLeaseHeld(lease: ArchiveLease, nowIso: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

export interface ArchiveRunRestoreRequest {
  readonly restoreId: string;
  readonly runId: string;
  readonly archiveUnitKey: string;
  readonly objectKey: string;
  readonly targetSchema: string;
  readonly requesterId: string;
  readonly reason: string;
  readonly startedAtIso: string;
}

export interface ArchiveUnitRestoreRequest {
  readonly restoreId: string;
  readonly archiveUnitKey: string;
  readonly objectKey: string;
  readonly targetSchema: string;
  readonly requesterId: string;
  readonly reason: string;
  readonly startedAtIso: string;
}

export interface ArchiveRestoreResult {
  readonly restoreId: string;
  readonly rowsRestored: number;
  readonly targetSchema: string;
  readonly completedAtIso: string;
}

export interface RestoreLogRecord {
  readonly restoreId: string;
  readonly archiveUnitKey: string | null;
  readonly runId: string | null;
  readonly targetSchema: string;
  readonly requesterId: string;
  readonly reason: string;
  readonly status: 'STARTED';
  readonly startedAt: string;
}

export interface IRunArchiveRestoreStore {
  startRestoreLog(input: Omit<RestoreLogRecord, 'status'>): Promise<RestoreLogRecord>;

  markRestoreCompleted(
    restoreId: string,
    rowsRestored: number,
    completedAtIso: string
  ): Promise<void>;

  markRestoreFailed(restoreId: string, error: string, failedAtIso: string): Promise<void>;

  /** Write restored events into the given target schema's run_events table. */
  writeRestoredEvents(events: readonly EventEnvelope[], targetSchema: string): Promise<number>;

  /**
   * Look up the latest exported batch record for an archive unit.
   * Returns null if no exported batch exists.
   */
  getExportedBatchForUnit(
    archiveUnitKey: string
  ): Promise<{ batchId: string; objectKey: string; tenantBucket: string } | null>;
}

// ---------------------------------------------------------------------------
// Extended IRunArchiveStore — delete + restore operations
// ---------------------------------------------------------------------------

export interface IRunArchiveDeleteStore {
  /**
   * Transition VERIFIED → DELETE_ELIGIBLE and set delete_after.
   * Returns the archive unit keys that were transitioned.
   */
  markDeleteEligibleUnits(
    policy: RunArchiveDeletionPolicy,
    nowIso: string
  ): Promise<readonly DeleteEligibleArchiveUnit[]>;

  /**
   * List DELETE_ELIGIBLE units whose delete_after timestamp has passed.
   */
  listDueForDrop(
    policy: RunArchiveDeletionPolicy,
    nowIso: string
  ): Promise<readonly DeleteEligibleArchiveUnit[]>;

  /**
   * Delete hot run_events rows for the given archive unit.
   * Must only be called after lease assertion.
   */
  dropHotArchiveUnit(
    archiveUnitKey: string,
    droppedAtIso: string
  ): Promise<{ rowsDeleted: number }>;

  /** Record a successful drop batch. */
  markArchiveBatchDropped(record: ArchiveBatchDroppedRecord): Promise<void>;
}

export function buildArchivedSnapshotsForUnit(params: {
  archiveUnitKey: string;
  archivedAtIso: string;
  snapshotCandidates: readonly ArchiveUnitTerminalSnapshotCandidate[];
  events: readonly EventEnvelope[];
  buildPinnedTerminalSnapshot: (input: {
    snapshot: WorkflowSnapshot;
    events: readonly EventEnvelope[];
  }) => {
    runId: string;
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    lastRunSeq: number;
    eventChecksumSha256: string;
    snapshot: WorkflowSnapshot;
  };
  buildArchivedTerminalSnapshot: (input: {
    tenantId: string;
    archiveUnitKey: string;
    archivedAtIso: string;
    pinned: {
      runId: string;
      status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
      lastRunSeq: number;
      eventChecksumSha256: string;
      snapshot: WorkflowSnapshot;
    };
  }) => ArchivedTerminalSnapshot;
}): readonly ArchivedTerminalSnapshot[] {
  const eventsByRun = new Map<string, EventEnvelope[]>();
  for (const event of params.events) {
    const runEvents = eventsByRun.get(event.runId);
    if (runEvents) {
      runEvents.push(event);
      continue;
    }
    eventsByRun.set(event.runId, [event]);
  }

  return params.snapshotCandidates.map((candidate) => {
    const runEvents = eventsByRun.get(candidate.runId);
    if (!runEvents || runEvents.length === 0) {
      throw new Error(`ARCHIVE_TERMINAL_SNAPSHOT_EVENTS_NOT_FOUND: ${candidate.runId}`);
    }

    const pinned = params.buildPinnedTerminalSnapshot({
      snapshot: candidate.snapshot,
      events: runEvents,
    });

    return params.buildArchivedTerminalSnapshot({
      tenantId: candidate.tenantId,
      archiveUnitKey: params.archiveUnitKey,
      archivedAtIso: params.archivedAtIso,
      pinned,
    });
  });
}
