import type { EventEnvelope, WorkflowSnapshot } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { TerminalSnapshotPinResult } from '../src/lifecycle/archiveArtifacts.js';
import type {
  ArchiveBatchExportedRecord,
  ArchiveBatchFailureRecord,
  ArchiveBatchRecord,
  ArchiveBatchVerifiedRecord,
  ArchiveExportRequest,
  ArchiveExportedUnit,
  ArchiveLifecycleTelemetry,
  ArchiveUnitTerminalSnapshotCandidate,
  ArchivedTerminalSnapshot,
  EligibleArchiveUnit,
  IRunArchiveExporter,
  IRunArchiveStore,
  PendingArchiveVerification,
  RunEventRetentionPolicy,
} from '../src/lifecycle/archiveRuntime.js';
import { RunArchiveCoordinator } from '../src/lifecycle/RunArchiveCoordinator.js';
import { RunArchiveVerifier } from '../src/lifecycle/RunArchiveVerifier.js';

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

function makeTerminalSnapshot(runId: string): WorkflowSnapshot {
  return {
    runId,
    status: 'COMPLETED',
    startedAt: '2026-03-19T00:00:00.000Z',
    completedAt: '2026-03-19T01:00:00.000Z',
    paused: false,
    cancelling: false,
    gatewayDecisions: {},
    steps: {},
  };
}

function makeEligibleUnit(overrides: Partial<EligibleArchiveUnit> = {}): EligibleArchiveUnit {
  return {
    archiveUnitKey: 'tb07_2026_03_19',
    tenantBucket: 'tb07',
    tenantIds: ['tenant-a'],
    rowCount: 2,
    minRunSeq: 1,
    maxRunSeq: 2,
    state: 'ELIGIBLE',
    ...overrides,
  };
}

function makeExportedUnit(unit: EligibleArchiveUnit): ArchiveExportedUnit {
  return {
    archiveUnitKey: unit.archiveUnitKey,
    tenantBucket: unit.tenantBucket,
    tenantIds: unit.tenantIds,
    rowCount: unit.rowCount,
    minRunSeq: unit.minRunSeq,
    maxRunSeq: unit.maxRunSeq,
    objectKey: `archive/${unit.archiveUnitKey}/events.jsonl`,
    objectUri: `mem://archive/${unit.archiveUnitKey}/events.jsonl`,
    manifestObjectKey: `archive/${unit.archiveUnitKey}/manifest.json`,
    checksumObjectKey: `archive/${unit.archiveUnitKey}/checksum.sha256`,
    checksumSha256: 'a'.repeat(64),
    manifestSha256: 'b'.repeat(64),
    exportedAtIso: '2026-03-20T00:00:00.000Z',
  };
}

const RETENTION_POLICY: RunEventRetentionPolicy = {
  hotRetentionDays: 30,
  archiveBucketCount: 64,
  pinTerminalSnapshots: true,
};

const NOW = '2026-03-21T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Stub store builder
// ---------------------------------------------------------------------------

interface StubStoreConfig {
  eligibleUnits?: readonly EligibleArchiveUnit[];
  events?: readonly EventEnvelope[];
  terminalSnapshots?: readonly ArchiveUnitTerminalSnapshotCandidate[];
  pinTerminalSnapshotResult?: TerminalSnapshotPinResult;
  startArchiveBatchError?: Error;
  markExportedError?: Error;
  pendingVerifications?: readonly PendingArchiveVerification[];
  markVerifiedError?: Error;
}

function buildStubStore(config: StubStoreConfig = {}): IRunArchiveStore & {
  startedBatches: string[];
  exportedBatches: ArchiveBatchExportedRecord[];
  failedBatches: ArchiveBatchFailureRecord[];
  verifiedBatches: ArchiveBatchVerifiedRecord[];
  verifyFailedBatches: ArchiveBatchFailureRecord[];
  pinnedSnapshots: ArchivedTerminalSnapshot[];
} {
  const startedBatches: string[] = [];
  const exportedBatches: ArchiveBatchExportedRecord[] = [];
  const failedBatches: ArchiveBatchFailureRecord[] = [];
  const verifiedBatches: ArchiveBatchVerifiedRecord[] = [];
  const verifyFailedBatches: ArchiveBatchFailureRecord[] = [];
  const pinnedSnapshots: ArchivedTerminalSnapshot[] = [];
  let batchSeq = 0;

  return {
    startedBatches,
    exportedBatches,
    failedBatches,
    verifiedBatches,
    verifyFailedBatches,
    pinnedSnapshots,

    async listEligibleArchiveUnits(_policy, _nowIso) {
      return config.eligibleUnits ?? [];
    },
    async startArchiveBatch(archiveUnitKey, startedAtIso): Promise<ArchiveBatchRecord> {
      if (config.startArchiveBatchError) {
        throw config.startArchiveBatchError;
      }
      const batchId = `batch-${++batchSeq}`;
      startedBatches.push(batchId);
      return { batchId, archiveUnitKey, startedAt: startedAtIso, status: 'STARTED' };
    },
    async loadArchiveUnitEvents(_archiveUnitKey) {
      return config.events ?? [makeEvent()];
    },
    async listTerminalSnapshotsForArchiveUnit(_archiveUnitKey) {
      return config.terminalSnapshots ?? [];
    },
    async markArchiveBatchExported(record) {
      if (config.markExportedError) {
        throw config.markExportedError;
      }
      exportedBatches.push(record);
    },
    async markArchiveBatchFailed(record) {
      failedBatches.push(record);
    },
    async listArchiveUnitsPendingVerification(_limit) {
      return config.pendingVerifications ?? [];
    },
    async markArchiveBatchVerified(record) {
      if (config.markVerifiedError) {
        throw config.markVerifiedError;
      }
      verifiedBatches.push(record);
    },
    async markArchiveBatchVerifyFailed(record) {
      verifyFailedBatches.push(record);
    },
    async pinTerminalSnapshot(snapshot) {
      pinnedSnapshots.push(snapshot);
      return (
        config.pinTerminalSnapshotResult ?? {
          outcome: 'APPLIED',
          tenantId: snapshot.tenantId,
          runId: snapshot.runId,
          archiveUnitKey: snapshot.archiveUnitKey,
          incomingLastRunSeq: snapshot.lastRunSeq,
          storedLastRunSeq: snapshot.lastRunSeq,
        }
      );
    },
    async getPinnedTerminalSnapshot(_tenantId, _runId) {
      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// Stub exporter builder
// ---------------------------------------------------------------------------

interface StubExporterConfig {
  exportError?: Error;
  verifyError?: Error;
  exportedUnit?: (unit: EligibleArchiveUnit) => ArchiveExportedUnit;
}

function buildStubExporter(
  units: readonly EligibleArchiveUnit[],
  config: StubExporterConfig = {}
): IRunArchiveExporter & { exportCalls: ArchiveExportRequest[]; verifyCalls: number } {
  const exportCalls: ArchiveExportRequest[] = [];
  let verifyCalls = 0;

  const unitsByKey = new Map(units.map((u) => [u.archiveUnitKey, u]));

  return {
    archiveFormat: 'jsonl',
    destinationKind: 'file',
    exportCalls,
    async exportArchiveUnit(input) {
      exportCalls.push(input);
      if (config.exportError) {
        throw config.exportError;
      }
      const unit =
        unitsByKey.get(input.archiveUnitKey) ??
        makeEligibleUnit({ archiveUnitKey: input.archiveUnitKey });
      return config.exportedUnit ? config.exportedUnit(unit) : makeExportedUnit(unit);
    },
    async verifyArchiveUnit(_input) {
      verifyCalls++;
      if (config.verifyError) {
        throw config.verifyError;
      }
    },
    get verifyCalls() {
      return verifyCalls;
    },
  };
}

// ---------------------------------------------------------------------------
// Recording telemetry
// ---------------------------------------------------------------------------

function buildRecordingTelemetry(): ArchiveLifecycleTelemetry & {
  counters: Record<string, number>;
  histograms: string[];
  infoMessages: string[];
  warnMessages: string[];
  errorMessages: string[];
} {
  const counters: Record<string, number> = {};
  const histograms: string[] = [];
  const infoMessages: string[] = [];
  const warnMessages: string[] = [];
  const errorMessages: string[] = [];

  return {
    counters,
    histograms,
    infoMessages,
    warnMessages,
    errorMessages,
    metrics: {
      addCounter(name, value) {
        counters[name] = (counters[name] ?? 0) + value;
      },
      recordHistogram(name, _value) {
        histograms.push(name);
      },
    },
    logger: {
      info(_data, msg) {
        if (msg) infoMessages.push(msg);
      },
      warn(_data, msg) {
        if (msg) warnMessages.push(msg);
      },
      error(_data, msg) {
        if (msg) errorMessages.push(msg);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// RunArchiveCoordinator tests
// ---------------------------------------------------------------------------

describe('RunArchiveCoordinator', () => {
  it('returns empty results when there are no eligible units', async () => {
    const store = buildStubStore({ eligibleUnits: [] });
    const exporter = buildStubExporter([]);
    const coordinator = new RunArchiveCoordinator({
      store,
      exporter,
      nowIso: () => NOW,
    });

    const results = await coordinator.archiveEligibleHotData(RETENTION_POLICY);
    expect(results).toHaveLength(0);
    expect(store.startedBatches).toHaveLength(0);
  });

  it('exports each eligible unit and records a batch', async () => {
    const units = [makeEligibleUnit(), makeEligibleUnit({ archiveUnitKey: 'tb07_2026_03_18' })];
    const store = buildStubStore({ eligibleUnits: units });
    const exporter = buildStubExporter(units);
    const coordinator = new RunArchiveCoordinator({ store, exporter, nowIso: () => NOW });

    const results = await coordinator.archiveEligibleHotData(RETENTION_POLICY);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.exported)).toBe(true);
    expect(store.exportedBatches).toHaveLength(2);
    expect(store.failedBatches).toHaveLength(0);
  });

  it('pins terminal snapshots when policy.pinTerminalSnapshots is true', async () => {
    const unit = makeEligibleUnit();
    const events = [
      makeEvent({ runId: 'run-a', runSeq: 1, persistedAt: '2026-03-19T08:00:00.000Z' }),
    ];
    const terminalSnapshots: ArchiveUnitTerminalSnapshotCandidate[] = [
      {
        tenantId: 'tenant-a',
        runId: 'run-a' as Parameters<typeof makeEvent>[0]['runId'] & string,
        snapshot: makeTerminalSnapshot('run-a'),
      },
    ];

    const store = buildStubStore({
      eligibleUnits: [unit],
      events,
      terminalSnapshots,
    });
    const exporter = buildStubExporter([unit]);
    const coordinator = new RunArchiveCoordinator({
      store,
      exporter,
      nowIso: () => NOW,
    });

    await coordinator.archiveEligibleHotData({ ...RETENTION_POLICY, pinTerminalSnapshots: true });

    expect(store.pinnedSnapshots).toHaveLength(1);
    expect(store.pinnedSnapshots[0].runId).toBe('run-a');
    expect(store.pinnedSnapshots[0].tenantId).toBe('tenant-a');
  });

  it('skips terminal snapshot pinning when policy.pinTerminalSnapshots is false', async () => {
    const unit = makeEligibleUnit();
    const terminalSnapshots: ArchiveUnitTerminalSnapshotCandidate[] = [
      { tenantId: 'tenant-a', runId: 'run-a' as string, snapshot: makeTerminalSnapshot('run-a') },
    ];
    const store = buildStubStore({
      eligibleUnits: [unit],
      events: [makeEvent({ runId: 'run-a', runSeq: 1 })],
      terminalSnapshots,
    });
    const exporter = buildStubExporter([unit]);
    const coordinator = new RunArchiveCoordinator({
      store,
      exporter,
      nowIso: () => NOW,
    });

    await coordinator.archiveEligibleHotData({ ...RETENTION_POLICY, pinTerminalSnapshots: false });

    expect(store.pinnedSnapshots).toHaveLength(0);
  });

  it('records a failed batch and continues with the next unit when export throws', async () => {
    const goodUnit = makeEligibleUnit({ archiveUnitKey: 'tb07_2026_03_17' });
    const badUnit = makeEligibleUnit({ archiveUnitKey: 'tb07_2026_03_18' });
    const units = [badUnit, goodUnit];

    const exportError = new Error('S3 timeout');
    const store = buildStubStore({ eligibleUnits: units });

    // Make good unit succeed after bad unit throws: override per-call
    let callCount = 0;
    const mixedExporter: IRunArchiveExporter = {
      archiveFormat: 'jsonl',
      destinationKind: 'file',
      async exportArchiveUnit(input) {
        callCount++;
        if (callCount === 1) {
          throw exportError;
        }
        return makeExportedUnit(goodUnit);
      },
      async verifyArchiveUnit(_input) {},
    };

    const coordinator = new RunArchiveCoordinator({
      store,
      exporter: mixedExporter,
      nowIso: () => NOW,
    });

    const results = await coordinator.archiveEligibleHotData(RETENTION_POLICY);

    expect(results).toHaveLength(2);
    expect(results[0].exported).toBe(false);
    expect(results[1].exported).toBe(true);
    expect(store.failedBatches).toHaveLength(1);
    expect(store.failedBatches[0].error).toContain('S3 timeout');
    expect(store.exportedBatches).toHaveLength(1);
  });

  it('emits metrics for eligible, exported, and duration', async () => {
    const unit = makeEligibleUnit();
    const store = buildStubStore({ eligibleUnits: [unit] });
    const exporter = buildStubExporter([unit]);
    const telemetry = buildRecordingTelemetry();
    const coordinator = new RunArchiveCoordinator({
      store,
      exporter,
      telemetry,
      nowIso: () => NOW,
    });

    await coordinator.archiveEligibleHotData(RETENTION_POLICY);

    expect(telemetry.counters['dvt.archive.units_eligible_total']).toBe(1);
    expect(telemetry.counters['dvt.archive.units_exported_total']).toBe(1);
    expect(telemetry.histograms).toContain('dvt.archive.export_duration_ms');
  });

  it('emits export_failures_total metric when export fails', async () => {
    const unit = makeEligibleUnit();
    const store = buildStubStore({ eligibleUnits: [unit] });
    const exporter = buildStubExporter([unit], { exportError: new Error('boom') });
    const telemetry = buildRecordingTelemetry();
    const coordinator = new RunArchiveCoordinator({
      store,
      exporter,
      telemetry,
      nowIso: () => NOW,
    });

    await coordinator.archiveEligibleHotData(RETENTION_POLICY);

    expect(telemetry.counters['dvt.archive.export_failures_total']).toBe(1);
    expect(telemetry.errorMessages).toContain('archive unit export failed');
  });

  it('emits a discard signal when terminal snapshot pin is stale', async () => {
    const unit = makeEligibleUnit();
    const store = buildStubStore({
      eligibleUnits: [unit],
      events: [makeEvent({ runId: 'run-a', runSeq: 1 })],
      terminalSnapshots: [
        {
          tenantId: 'tenant-a',
          runId: 'run-a',
          snapshot: makeTerminalSnapshot('run-a'),
        },
      ],
      pinTerminalSnapshotResult: {
        outcome: 'DISCARDED_STALE_SEQUENCE',
        tenantId: 'tenant-a',
        runId: 'run-a',
        archiveUnitKey: unit.archiveUnitKey,
        incomingLastRunSeq: 4,
        storedLastRunSeq: 5,
      },
    });
    const exporter = buildStubExporter([unit]);
    const telemetry = buildRecordingTelemetry();
    const coordinator = new RunArchiveCoordinator({
      store,
      exporter,
      telemetry,
      nowIso: () => NOW,
    });

    await coordinator.archiveEligibleHotData(RETENTION_POLICY);

    expect(telemetry.counters['dvt.archive.terminal_snapshot_discarded_total']).toBe(1);
    expect(telemetry.warnMessages).toContain('archive terminal snapshot discarded');
  });
});

// ---------------------------------------------------------------------------
// RunArchiveVerifier tests
// ---------------------------------------------------------------------------

function makePendingVerification(
  overrides: Partial<PendingArchiveVerification> = {}
): PendingArchiveVerification {
  return {
    batchId: 'batch-1',
    archiveUnitKey: 'tb07_2026_03_19',
    tenantBucket: 'tb07',
    tenantIds: ['tenant-a'],
    rowCount: 2,
    minRunSeq: 1,
    maxRunSeq: 2,
    objectKey: 'archive/tb07_2026_03_19/events.jsonl',
    checksumSha256: 'a'.repeat(64),
    exportedAtIso: '2026-03-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('RunArchiveVerifier', () => {
  it('returns empty results when there are no pending units', async () => {
    const store = buildStubStore({ pendingVerifications: [] });
    const exporter = buildStubExporter([]);
    const verifier = new RunArchiveVerifier({ store, exporter, nowIso: () => NOW });

    const results = await verifier.verifyExportedArchiveUnits();
    expect(results).toHaveLength(0);
  });

  it('verifies each pending unit and marks them VERIFIED', async () => {
    const pending = [
      makePendingVerification(),
      makePendingVerification({ batchId: 'batch-2', archiveUnitKey: 'tb07_2026_03_18' }),
    ];
    const store = buildStubStore({ pendingVerifications: pending });
    const exporter = buildStubExporter([]);
    const verifier = new RunArchiveVerifier({ store, exporter, nowIso: () => NOW });

    const results = await verifier.verifyExportedArchiveUnits();

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.verified)).toBe(true);
    expect(store.verifiedBatches).toHaveLength(2);
    expect(store.verifyFailedBatches).toHaveLength(0);
  });

  it('marks unit VERIFY_FAILED and continues when exporter.verifyArchiveUnit throws', async () => {
    const goodPending = makePendingVerification({
      batchId: 'batch-good',
      archiveUnitKey: 'tb07_2026_03_17',
    });
    const badPending = makePendingVerification({
      batchId: 'batch-bad',
      archiveUnitKey: 'tb07_2026_03_18',
    });
    const store = buildStubStore({ pendingVerifications: [badPending, goodPending] });

    let verifyCallCount = 0;
    const mixedExporter: IRunArchiveExporter = {
      archiveFormat: 'jsonl',
      destinationKind: 'file',
      async exportArchiveUnit(_input) {
        throw new Error('not used');
      },
      async verifyArchiveUnit(_input) {
        verifyCallCount++;
        if (verifyCallCount === 1) {
          throw new Error('ARCHIVE_MANIFEST_CHECKSUM_MISMATCH');
        }
      },
    };

    const verifier = new RunArchiveVerifier({ store, exporter: mixedExporter, nowIso: () => NOW });
    const results = await verifier.verifyExportedArchiveUnits();

    expect(results).toHaveLength(2);
    expect(results[0].verified).toBe(false);
    expect(results[1].verified).toBe(true);
    expect(store.verifyFailedBatches).toHaveLength(1);
    expect(store.verifyFailedBatches[0].error).toContain('CHECKSUM_MISMATCH');
    expect(store.verifiedBatches).toHaveLength(1);
  });

  it('respects the limit parameter', async () => {
    const listSpy = vi.fn().mockResolvedValue([]);
    const store = buildStubStore();
    store.listArchiveUnitsPendingVerification = listSpy;
    const exporter = buildStubExporter([]);
    const verifier = new RunArchiveVerifier({ store, exporter, nowIso: () => NOW });

    await verifier.verifyExportedArchiveUnits(25);

    expect(listSpy).toHaveBeenCalledWith(25);
  });

  it('emits units_verified_total metric on success', async () => {
    const pending = [makePendingVerification()];
    const store = buildStubStore({ pendingVerifications: pending });
    const exporter = buildStubExporter([]);
    const telemetry = buildRecordingTelemetry();
    const verifier = new RunArchiveVerifier({ store, exporter, telemetry, nowIso: () => NOW });

    await verifier.verifyExportedArchiveUnits();

    expect(telemetry.counters['dvt.archive.units_verified_total']).toBe(1);
    expect(telemetry.infoMessages).toContain('archive unit verified');
  });

  it('emits verify_failures_total metric on failure', async () => {
    const pending = [makePendingVerification()];
    const store = buildStubStore({ pendingVerifications: pending });
    const exporter = buildStubExporter([], { verifyError: new Error('bad checksum') });
    const telemetry = buildRecordingTelemetry();
    const verifier = new RunArchiveVerifier({ store, exporter, telemetry, nowIso: () => NOW });

    await verifier.verifyExportedArchiveUnits();

    expect(telemetry.counters['dvt.archive.verify_failures_total']).toBe(1);
    expect(telemetry.errorMessages).toContain('archive unit verification failed');
  });
});
