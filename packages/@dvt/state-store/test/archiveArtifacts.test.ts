import type { EventEnvelope, WorkflowSnapshot } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildArchivedTerminalSnapshot,
  buildArchiveUnitManifest,
  buildPinnedTerminalSnapshot,
  calculateArchiveEventChecksum,
} from '../src/lifecycle/archiveArtifacts.js';

describe('archiveArtifacts', () => {
  it('builds a deterministic archive manifest from ordered events', () => {
    const events = [
      makeEvent({
        runId: 'run-a',
        tenantId: 'tenant-b',
        runSeq: 2,
        persistedAt: '2026-03-19T02:00:00.000Z',
        payload: { b: 1, a: 2 },
      }),
      makeEvent({
        runId: 'run-b',
        tenantId: 'tenant-a',
        runSeq: 7,
        persistedAt: '2026-03-19T12:00:00.000Z',
      }),
      makeEvent({
        runId: 'run-a',
        tenantId: 'tenant-b',
        runSeq: 5,
        persistedAt: '2026-03-19T18:30:00.000Z',
      }),
    ] satisfies readonly EventEnvelope[];

    const equivalentEvents = [
      makeEvent({
        runId: 'run-a',
        tenantId: 'tenant-b',
        runSeq: 2,
        persistedAt: '2026-03-19T02:00:00.000Z',
        payload: { a: 2, b: 1 },
      }),
      makeEvent({
        runId: 'run-b',
        tenantId: 'tenant-a',
        runSeq: 7,
        persistedAt: '2026-03-19T12:00:00.000Z',
      }),
      makeEvent({
        runId: 'run-a',
        tenantId: 'tenant-b',
        runSeq: 5,
        persistedAt: '2026-03-19T18:30:00.000Z',
      }),
    ] satisfies readonly EventEnvelope[];

    const first = buildArchiveUnitManifest({
      archiveUnitKey: 'tb07_2026_03_19',
      tenantBucket: 'tb07',
      objectKey: 'archive/tb07_2026_03_19/events.parquet',
      exportedAtIso: '2026-03-20T00:00:00.000Z',
      events,
    });
    const second = buildArchiveUnitManifest({
      archiveUnitKey: 'tb07_2026_03_19',
      tenantBucket: 'tb07',
      objectKey: 'archive/tb07_2026_03_19/events.parquet',
      exportedAtIso: '2026-03-20T00:00:00.000Z',
      events: equivalentEvents,
    });

    expect(first.manifest).toEqual({
      archiveUnitKey: 'tb07_2026_03_19',
      tenantBucket: 'tb07',
      tenantIds: ['tenant-a', 'tenant-b'],
      rowCount: 3,
      minRunSeq: 2,
      maxRunSeq: 7,
      checksumSha256: first.manifest.checksumSha256,
      objectKey: 'archive/tb07_2026_03_19/events.parquet',
      exportedAt: '2026-03-20T00:00:00.000Z',
    });
    expect(first.manifest.checksumSha256).toBe(second.manifest.checksumSha256);
    expect(first.canonicalManifestJson).toBe(second.canonicalManifestJson);
    expect(first.manifestSha256).toBe(second.manifestSha256);
  });

  it('rejects archive manifests with empty event sets', () => {
    expect(() =>
      buildArchiveUnitManifest({
        archiveUnitKey: 'tb07_2026_03_19',
        tenantBucket: 'tb07',
        objectKey: 'archive/tb07_2026_03_19/events.parquet',
        exportedAtIso: '2026-03-20T00:00:00.000Z',
        events: [],
      })
    ).toThrow(/ARCHIVE_EVENTS_REQUIRED/);
  });

  it('rejects archive manifests when events fall outside the archive unit day', () => {
    expect(() =>
      buildArchiveUnitManifest({
        archiveUnitKey: 'tb07_2026_03_19',
        tenantBucket: 'tb07',
        objectKey: 'archive/tb07_2026_03_19/events.parquet',
        exportedAtIso: '2026-03-20T00:00:00.000Z',
        events: [
          makeEvent({
            persistedAt: '2026-03-20T00:00:00.000Z',
          }),
        ],
      })
    ).toThrow(/ARCHIVE_EVENT_DAY_MISMATCH/);
  });

  it('rejects archive manifests when the tenant bucket disagrees with the key', () => {
    expect(() =>
      buildArchiveUnitManifest({
        archiveUnitKey: 'tb07_2026_03_19',
        tenantBucket: 'tb08',
        objectKey: 'archive/tb07_2026_03_19/events.parquet',
        exportedAtIso: '2026-03-20T00:00:00.000Z',
        events: [makeEvent()],
      })
    ).toThrow(/ARCHIVE_TENANT_BUCKET_MISMATCH/);
  });

  it('pins a terminal snapshot with last runSeq and event checksum', () => {
    const snapshot: WorkflowSnapshot = {
      runId: 'run-terminal',
      status: 'COMPLETED',
      startedAt: '2026-03-19T00:00:00.000Z',
      completedAt: '2026-03-19T01:00:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
    const events = [
      makeEvent({ runId: 'run-terminal', runSeq: 1 }),
      makeEvent({ runId: 'run-terminal', runSeq: 2 }),
      makeEvent({ runId: 'run-terminal', runSeq: 3 }),
    ] satisfies readonly EventEnvelope[];

    expect(
      buildPinnedTerminalSnapshot({
        snapshot,
        events,
      })
    ).toEqual({
      runId: 'run-terminal',
      status: 'COMPLETED',
      lastRunSeq: 3,
      eventChecksumSha256: calculateArchiveEventChecksum(events),
      snapshot,
    });
  });

  it('builds an archived terminal snapshot record for persistence', () => {
    const snapshot: WorkflowSnapshot = {
      runId: 'run-terminal',
      status: 'COMPLETED',
      startedAt: '2026-03-19T00:00:00.000Z',
      completedAt: '2026-03-19T01:00:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };
    const events = [
      makeEvent({ runId: 'run-terminal', runSeq: 1 }),
      makeEvent({ runId: 'run-terminal', runSeq: 2 }),
    ] satisfies readonly EventEnvelope[];

    const pinned = buildPinnedTerminalSnapshot({ snapshot, events });

    expect(
      buildArchivedTerminalSnapshot({
        tenantId: ' tenant-a ',
        archiveUnitKey: 'tb07_2026_03_19',
        archivedAtIso: '2026-03-20T00:00:00.000Z',
        pinned,
      })
    ).toEqual({
      tenantId: 'tenant-a',
      archiveUnitKey: 'tb07_2026_03_19',
      archivedAt: '2026-03-20T00:00:00.000Z',
      runId: 'run-terminal',
      status: 'COMPLETED',
      lastRunSeq: 2,
      eventChecksumSha256: calculateArchiveEventChecksum(events),
      snapshot,
    });
  });

  it('rejects pinned snapshots for non-terminal runs', () => {
    const snapshot: WorkflowSnapshot = {
      runId: 'run-non-terminal',
      status: 'RUNNING',
      startedAt: '2026-03-19T00:00:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };

    expect(() =>
      buildPinnedTerminalSnapshot({
        snapshot,
        events: [makeEvent({ runId: 'run-non-terminal', runSeq: 1 })],
      })
    ).toThrow(/ARCHIVE_TERMINAL_SNAPSHOT_STATUS_INVALID/);
  });

  it('rejects pinned snapshots when events span multiple runs', () => {
    const snapshot: WorkflowSnapshot = {
      runId: 'run-a',
      status: 'FAILED',
      startedAt: '2026-03-19T00:00:00.000Z',
      completedAt: '2026-03-19T00:10:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };

    expect(() =>
      buildPinnedTerminalSnapshot({
        snapshot,
        events: [
          makeEvent({ runId: 'run-a', runSeq: 1 }),
          makeEvent({ runId: 'run-b', runSeq: 2 }),
        ],
      })
    ).toThrow(/ARCHIVE_TERMINAL_SNAPSHOT_RUN_ID_MISMATCH/);
  });

  it('rejects pinned snapshots when event order is not strictly increasing', () => {
    const snapshot: WorkflowSnapshot = {
      runId: 'run-a',
      status: 'CANCELLED',
      startedAt: '2026-03-19T00:00:00.000Z',
      completedAt: '2026-03-19T00:10:00.000Z',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    };

    expect(() =>
      buildPinnedTerminalSnapshot({
        snapshot,
        events: [
          makeEvent({ runId: 'run-a', runSeq: 2 }),
          makeEvent({ runId: 'run-a', runSeq: 1 }),
        ],
      })
    ).toThrow(/ARCHIVE_TERMINAL_SNAPSHOT_RUN_SEQ_INVALID/);
  });

  it('rejects archived terminal snapshots without a tenant id', () => {
    const pinned = buildPinnedTerminalSnapshot({
      snapshot: {
        runId: 'run-terminal',
        status: 'FAILED',
        startedAt: '2026-03-19T00:00:00.000Z',
        completedAt: '2026-03-19T00:10:00.000Z',
        paused: false,
        cancelling: false,
        gatewayDecisions: {},
        steps: {},
      },
      events: [makeEvent({ runId: 'run-terminal', runSeq: 1 })],
    });

    expect(() =>
      buildArchivedTerminalSnapshot({
        tenantId: '   ',
        archiveUnitKey: 'tb07_2026_03_19',
        archivedAtIso: '2026-03-20T00:00:00.000Z',
        pinned,
      })
    ).toThrow(/ARCHIVE_TERMINAL_SNAPSHOT_TENANT_ID_REQUIRED/);
  });

  it('rejects archived terminal snapshots with malformed checksums', () => {
    const pinned = buildPinnedTerminalSnapshot({
      snapshot: {
        runId: 'run-terminal',
        status: 'CANCELLED',
        startedAt: '2026-03-19T00:00:00.000Z',
        completedAt: '2026-03-19T00:10:00.000Z',
        paused: false,
        cancelling: false,
        gatewayDecisions: {},
        steps: {},
      },
      events: [makeEvent({ runId: 'run-terminal', runSeq: 1 })],
    });

    expect(() =>
      buildArchivedTerminalSnapshot({
        tenantId: 'tenant-a',
        archiveUnitKey: 'tb07_2026_03_19',
        archivedAtIso: '2026-03-20T00:00:00.000Z',
        pinned: {
          ...pinned,
          eventChecksumSha256: 'not-a-sha256',
        },
      })
    ).toThrow(/ARCHIVE_TERMINAL_SNAPSHOT_CHECKSUM_INVALID/);
  });
});

function makeEvent(overrides: Partial<EventEnvelope> = {}): EventEnvelope {
  return {
    eventId: 'event-1',
    eventType: 'RunQueued',
    runId: 'run-default',
    emittedAt: '2026-03-19T00:00:00.000Z',
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
    planId: 'plan-a',
    planVersion: '1.0.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    idempotencyKey: `${overrides.runId ?? 'run-default'}:${overrides.runSeq ?? 1}`,
    runSeq: 1,
    persistedAt: '2026-03-19T00:00:00.000Z',
    ...overrides,
  };
}
