/**
 * @file packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts
 * @baseline ADR-0004: Event Sourcing Strategy (ordered authoritative history)
 * @baseline ADR-0037: Run Event Lifecycle Archival, Verification, and Restore Model
 * @decision PR1 archive artifacts use one deterministic JCS + SHA-256 checksum rule
 * @consequence Exporters, verifiers, and snapshot pinning share one canonical artifact surface
 */
import type { EventEnvelope, RunStatus, WorkflowSnapshot } from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import { parseArchiveUnitKey } from '../archiveLifecycle.js';

export type TerminalRunStatus = Extract<RunStatus, 'COMPLETED' | 'FAILED' | 'CANCELLED'>;

export interface ArchiveManifestBuildInput {
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly objectKey: string;
  readonly exportedAtIso: string;
  readonly events: readonly EventEnvelope[];
}

export interface ArchiveUnitManifest {
  readonly archiveUnitKey: string;
  readonly tenantBucket: string;
  readonly tenantIds: readonly string[];
  readonly rowCount: number;
  readonly minRunSeq: number;
  readonly maxRunSeq: number;
  readonly checksumSha256: string;
  readonly objectKey: string;
  readonly exportedAt: string;
}

export interface ArchiveManifestBuildResult {
  readonly manifest: ArchiveUnitManifest;
  readonly canonicalManifestJson: string;
  readonly manifestSha256: string;
}

export interface PinnedTerminalSnapshotBuildInput {
  readonly snapshot: WorkflowSnapshot;
  readonly events: readonly EventEnvelope[];
}

export interface PinnedTerminalSnapshot {
  readonly runId: string;
  readonly status: TerminalRunStatus;
  readonly lastRunSeq: number;
  readonly eventChecksumSha256: string;
  readonly snapshot: WorkflowSnapshot;
}

export interface ArchivedTerminalSnapshotBuildInput {
  readonly tenantId: string;
  readonly archiveUnitKey: string;
  readonly archivedAtIso: string;
  readonly pinned: PinnedTerminalSnapshot;
}

export interface ArchivedTerminalSnapshot extends PinnedTerminalSnapshot {
  readonly tenantId: string;
  readonly archiveUnitKey: string;
  readonly archivedAt: string;
}

export type TerminalSnapshotPinOutcome = 'APPLIED' | 'DISCARDED_STALE_SEQUENCE';

export interface TerminalSnapshotPinResult {
  readonly outcome: TerminalSnapshotPinOutcome;
  readonly tenantId: string;
  readonly runId: string;
  readonly archiveUnitKey: string;
  readonly incomingLastRunSeq: number;
  readonly storedLastRunSeq: number;
}

export interface TerminalSnapshotPinStore {
  pinTerminalSnapshot(snapshot: ArchivedTerminalSnapshot): Promise<TerminalSnapshotPinResult>;
  getPinnedTerminalSnapshot(
    tenantId: string,
    runId: string
  ): Promise<ArchivedTerminalSnapshot | null>;
}

const TERMINAL_STATUSES: readonly TerminalRunStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

export function calculateArchiveEventChecksum(events: readonly EventEnvelope[]): string {
  if (events.length === 0) {
    throw new Error('ARCHIVE_EVENTS_REQUIRED');
  }

  let rollingDigest = sha256HexUtf8('');

  for (const event of events) {
    rollingDigest = sha256HexUtf8(`${rollingDigest}\n${jcsCanonicalize(event)}`);
  }

  return rollingDigest;
}

export function buildArchiveUnitManifest(
  input: ArchiveManifestBuildInput
): ArchiveManifestBuildResult {
  const parsedKey = parseArchiveUnitKey(input.archiveUnitKey);
  const tenantBucket = input.tenantBucket.trim();
  const objectKey = input.objectKey.trim();
  const exportedAt = parseIsoUtc(input.exportedAtIso, 'ARCHIVE_EXPORTED_AT_INVALID');
  const events = input.events;

  if (tenantBucket !== parsedKey.tenantBucket) {
    throw new Error('ARCHIVE_TENANT_BUCKET_MISMATCH');
  }
  if (!objectKey) {
    throw new Error('ARCHIVE_OBJECT_KEY_REQUIRED');
  }
  if (events.length === 0) {
    throw new Error('ARCHIVE_EVENTS_REQUIRED');
  }

  const tenantIds = new Set<string>();
  let minRunSeq = Number.POSITIVE_INFINITY;
  let maxRunSeq = Number.NEGATIVE_INFINITY;

  for (const event of events) {
    const tenantId = event.tenantId.trim();
    if (!tenantId) {
      throw new Error('ARCHIVE_EVENT_TENANT_ID_INVALID');
    }
    if (!Number.isInteger(event.runSeq) || event.runSeq <= 0) {
      throw new Error('ARCHIVE_EVENT_RUN_SEQ_INVALID');
    }
    if (normalizeEventPersistedAtDay(event.persistedAt) !== parsedKey.persistedAtDay) {
      throw new Error('ARCHIVE_EVENT_DAY_MISMATCH');
    }

    tenantIds.add(tenantId);
    minRunSeq = Math.min(minRunSeq, event.runSeq);
    maxRunSeq = Math.max(maxRunSeq, event.runSeq);
  }

  const manifest: ArchiveUnitManifest = {
    archiveUnitKey: input.archiveUnitKey.trim(),
    tenantBucket,
    tenantIds: Array.from(tenantIds).sort(),
    rowCount: events.length,
    minRunSeq,
    maxRunSeq,
    checksumSha256: calculateArchiveEventChecksum(events),
    objectKey,
    exportedAt: exportedAt.toISOString(),
  };

  const canonicalManifestJson = jcsCanonicalize(manifest);
  return {
    manifest,
    canonicalManifestJson,
    manifestSha256: sha256HexUtf8(canonicalManifestJson),
  };
}

export function buildPinnedTerminalSnapshot(
  input: PinnedTerminalSnapshotBuildInput
): PinnedTerminalSnapshot {
  const { snapshot, events } = input;

  if (!TERMINAL_STATUSES.includes(snapshot.status as TerminalRunStatus)) {
    throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_STATUS_INVALID');
  }
  if (events.length === 0) {
    throw new Error('ARCHIVE_EVENTS_REQUIRED');
  }

  let previousRunSeq = 0;
  for (const event of events) {
    if (event.runId !== snapshot.runId) {
      throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_RUN_ID_MISMATCH');
    }
    if (!Number.isInteger(event.runSeq) || event.runSeq <= previousRunSeq) {
      throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_RUN_SEQ_INVALID');
    }
    previousRunSeq = event.runSeq;
  }

  return {
    runId: snapshot.runId,
    status: snapshot.status as TerminalRunStatus,
    lastRunSeq: previousRunSeq,
    eventChecksumSha256: calculateArchiveEventChecksum(events),
    snapshot,
  };
}

export function buildArchivedTerminalSnapshot(
  input: ArchivedTerminalSnapshotBuildInput
): ArchivedTerminalSnapshot {
  const tenantId = input.tenantId.trim();
  const archiveUnitKey = input.archiveUnitKey.trim();
  const archivedAt = parseIsoUtc(
    input.archivedAtIso,
    'ARCHIVE_TERMINAL_SNAPSHOT_ARCHIVED_AT_INVALID'
  );
  const pinned = input.pinned;

  if (!tenantId) {
    throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_TENANT_ID_REQUIRED');
  }
  parseArchiveUnitKey(archiveUnitKey);

  if (!Number.isInteger(pinned.lastRunSeq) || pinned.lastRunSeq <= 0) {
    throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_LAST_RUN_SEQ_INVALID');
  }
  if (!/^[a-f0-9]{64}$/.test(pinned.eventChecksumSha256)) {
    throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_CHECKSUM_INVALID');
  }
  if (pinned.snapshot.runId !== pinned.runId) {
    throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_RUN_ID_MISMATCH');
  }
  if (pinned.snapshot.status !== pinned.status) {
    throw new Error('ARCHIVE_TERMINAL_SNAPSHOT_STATUS_MISMATCH');
  }

  return {
    tenantId,
    archiveUnitKey,
    archivedAt: archivedAt.toISOString(),
    ...pinned,
  };
}

function normalizeEventPersistedAtDay(value: string): string {
  const parsed = parseIsoUtc(value, 'ARCHIVE_EVENT_PERSISTED_AT_INVALID');
  return parsed.toISOString().slice(0, 10).replaceAll('-', '_');
}

function parseIsoUtc(value: string, errorCode: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(errorCode);
  }
  return parsed;
}
