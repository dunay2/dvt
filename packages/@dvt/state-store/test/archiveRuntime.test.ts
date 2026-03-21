import type { EventEnvelope, WorkflowSnapshot } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildArchivedTerminalSnapshot,
  buildPinnedTerminalSnapshot,
} from '../src/lifecycle/archiveArtifacts.js';
import {
  buildArchivedSnapshotsForUnit,
  toArchiveFailureMessage,
} from '../src/lifecycle/archiveRuntime.js';
import type { ArchiveUnitTerminalSnapshotCandidate } from '../src/lifecycle/archiveRuntime.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    eventId: 'event-1',
    eventType: 'RunQueued',
    runId: 'run-a',
    emittedAt: '2026-03-19T00:00:00.000Z',
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
    planId: 'plan-a',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: `${overrides.runId ?? 'run-a'}:${overrides.runSeq ?? 1}`,
    runSeq: 1,
    persistedAt: '2026-03-19T08:00:00.000Z',
    ...overrides,
  };
}

function makeTerminalSnapshot(
  runId: string,
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED' = 'COMPLETED'
): WorkflowSnapshot {
  return {
    runId,
    status,
    startedAt: '2026-03-19T00:00:00.000Z',
    completedAt: '2026-03-19T01:00:00.000Z',
    paused: false,
    cancelling: false,
    gatewayDecisions: {},
    steps: {},
  };
}

const ARCHIVE_UNIT_KEY = 'tb07_2026_03_19';
const ARCHIVED_AT = '2026-03-20T00:00:00.000Z';

// ---------------------------------------------------------------------------
// buildArchivedSnapshotsForUnit
// ---------------------------------------------------------------------------

describe('buildArchivedSnapshotsForUnit', () => {
  it('maps snapshot candidates to archived snapshots using provided builders', () => {
    const runId = 'run-a';
    const events = [makeEvent({ runId, runSeq: 1 }), makeEvent({ runId, runSeq: 2 })];
    const candidates: ArchiveUnitTerminalSnapshotCandidate[] = [
      { tenantId: 'tenant-a', runId, snapshot: makeTerminalSnapshot(runId) },
    ];

    const result = buildArchivedSnapshotsForUnit({
      archiveUnitKey: ARCHIVE_UNIT_KEY,
      archivedAtIso: ARCHIVED_AT,
      snapshotCandidates: candidates,
      events,
      buildPinnedTerminalSnapshot,
      buildArchivedTerminalSnapshot,
    });

    expect(result).toHaveLength(1);
    expect(result[0].runId).toBe(runId);
    expect(result[0].tenantId).toBe('tenant-a');
    expect(result[0].archiveUnitKey).toBe(ARCHIVE_UNIT_KEY);
    expect(result[0].archivedAt).toBe(ARCHIVED_AT);
    expect(result[0].lastRunSeq).toBe(2);
    expect(result[0].eventChecksumSha256).toBeTruthy();
  });

  it('handles multiple snapshot candidates across different runs', () => {
    const eventsRunA = [makeEvent({ runId: 'run-a', runSeq: 1 })];
    const eventsRunB = [makeEvent({ runId: 'run-b', tenantId: 'tenant-b', runSeq: 3 })];
    const candidates: ArchiveUnitTerminalSnapshotCandidate[] = [
      { tenantId: 'tenant-a', runId: 'run-a', snapshot: makeTerminalSnapshot('run-a') },
      { tenantId: 'tenant-b', runId: 'run-b', snapshot: makeTerminalSnapshot('run-b', 'FAILED') },
    ];

    const result = buildArchivedSnapshotsForUnit({
      archiveUnitKey: ARCHIVE_UNIT_KEY,
      archivedAtIso: ARCHIVED_AT,
      snapshotCandidates: candidates,
      events: [...eventsRunA, ...eventsRunB],
      buildPinnedTerminalSnapshot,
      buildArchivedTerminalSnapshot,
    });

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.runId).sort()).toEqual(['run-a', 'run-b']);
    expect(result.find((r) => r.runId === 'run-b')?.status).toBe('FAILED');
  });

  it('returns empty array when there are no snapshot candidates', () => {
    const events = [makeEvent({ runId: 'run-a', runSeq: 1 })];

    const result = buildArchivedSnapshotsForUnit({
      archiveUnitKey: ARCHIVE_UNIT_KEY,
      archivedAtIso: ARCHIVED_AT,
      snapshotCandidates: [],
      events,
      buildPinnedTerminalSnapshot,
      buildArchivedTerminalSnapshot,
    });

    expect(result).toHaveLength(0);
  });

  it('throws ARCHIVE_TERMINAL_SNAPSHOT_EVENTS_NOT_FOUND when candidate run has no matching events', () => {
    const candidates: ArchiveUnitTerminalSnapshotCandidate[] = [
      { tenantId: 'tenant-a', runId: 'run-orphan', snapshot: makeTerminalSnapshot('run-orphan') },
    ];
    const events = [makeEvent({ runId: 'run-a', runSeq: 1 })]; // run-orphan has no events

    expect(() =>
      buildArchivedSnapshotsForUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        archivedAtIso: ARCHIVED_AT,
        snapshotCandidates: candidates,
        events,
        buildPinnedTerminalSnapshot,
        buildArchivedTerminalSnapshot,
      })
    ).toThrow(/ARCHIVE_TERMINAL_SNAPSHOT_EVENTS_NOT_FOUND/);
  });

  it('derives lastRunSeq and eventChecksumSha256 from per-run events (caller must pre-sort)', () => {
    const runId = 'run-a';
    // Events must arrive in strict runSeq order — that is the coordinator's responsibility
    const events = [
      makeEvent({ runId, runSeq: 1 }),
      makeEvent({ runId, runSeq: 2 }),
      makeEvent({ runId, runSeq: 3 }),
    ];
    const candidates: ArchiveUnitTerminalSnapshotCandidate[] = [
      { tenantId: 'tenant-a', runId, snapshot: makeTerminalSnapshot(runId) },
    ];

    const result = buildArchivedSnapshotsForUnit({
      archiveUnitKey: ARCHIVE_UNIT_KEY,
      archivedAtIso: ARCHIVED_AT,
      snapshotCandidates: candidates,
      events,
      buildPinnedTerminalSnapshot,
      buildArchivedTerminalSnapshot,
    });

    expect(result[0].lastRunSeq).toBe(3);
    expect(result[0].eventChecksumSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// toArchiveFailureMessage
// ---------------------------------------------------------------------------

describe('toArchiveFailureMessage', () => {
  it('returns the error message for an Error instance', () => {
    expect(toArchiveFailureMessage(new Error('connection refused'))).toBe('connection refused');
  });

  it('coerces non-Error values to string', () => {
    expect(toArchiveFailureMessage('raw string failure')).toBe('raw string failure');
    expect(toArchiveFailureMessage(42)).toBe('42');
    expect(toArchiveFailureMessage({ code: 'ERR' })).toBe('[object Object]');
  });

  it('falls back to String(error) for Error instances with empty message', () => {
    const err = new Error('');
    // empty message is falsy, so the function falls through to String(error) → "Error"
    expect(toArchiveFailureMessage(err)).toBe('Error');
  });
});
