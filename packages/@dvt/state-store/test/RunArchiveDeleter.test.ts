import { describe, expect, it, vi } from 'vitest';

import type {
  ArchiveBatchDroppedRecord,
  ArchiveLease,
  ArchiveLifecycleTelemetry,
  DeleteEligibleArchiveUnit,
  IArchiveLeaseStore,
  IRunArchiveDeleteStore,
  RunArchiveDeletionPolicy,
} from '../src/lifecycle/archiveRuntime.js';
import { RunArchiveDeleter } from '../src/lifecycle/RunArchiveDeleter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POLICY: RunArchiveDeletionPolicy = {
  deletionGraceDays: 30,
  maxUnitsPerRun: 10,
  leaseTimeoutSeconds: 60,
  workerId: 'test-worker-1',
};

const NOW = '2026-04-20T00:00:00.000Z';

function makeDeleteEligibleUnit(
  overrides: Partial<DeleteEligibleArchiveUnit> = {}
): DeleteEligibleArchiveUnit {
  return {
    archiveUnitKey: 'tb07_2026_03_19',
    tenantBucket: 'tb07',
    tenantIds: ['tenant-a'],
    rowCount: 100,
    objectKey: 'archive/tb07_2026_03_19/events.jsonl',
    verifiedAtIso: '2026-03-20T00:00:00.000Z',
    deleteAfterIso: '2026-04-19T00:00:00.000Z',
    state: 'DELETE_ELIGIBLE',
    ...overrides,
  };
}

const FAKE_LEASE: ArchiveLease = {
  workerId: POLICY.workerId,
  leaseToken: 'token-abc',
  acquiredAt: NOW,
  expiresAt: '2026-04-20T00:01:00.000Z',
};

// ---------------------------------------------------------------------------
// Stub builders
// ---------------------------------------------------------------------------

function buildStubDeleteStore(config: {
  markDeleteEligibleResult?: readonly DeleteEligibleArchiveUnit[];
  dueForDropResult?: readonly DeleteEligibleArchiveUnit[];
  dropResult?: { rowsDeleted: number };
  dropError?: Error;
}): IRunArchiveDeleteStore & {
  droppedUnits: string[];
  droppedBatches: ArchiveBatchDroppedRecord[];
} {
  const droppedUnits: string[] = [];
  const droppedBatches: ArchiveBatchDroppedRecord[] = [];

  return {
    droppedUnits,
    droppedBatches,
    async markDeleteEligibleUnits(_policy, _nowIso) {
      return config.markDeleteEligibleResult ?? [];
    },
    async listDueForDrop(_policy, _nowIso) {
      return config.dueForDropResult ?? [];
    },
    async dropHotArchiveUnit(archiveUnitKey, _droppedAtIso) {
      if (config.dropError) {
        throw config.dropError;
      }
      droppedUnits.push(archiveUnitKey);
      return config.dropResult ?? { rowsDeleted: 10 };
    },
    async markArchiveBatchDropped(record) {
      droppedBatches.push(record);
    },
  };
}

function buildStubLeaseStore(config: {
  acquireResult?: ArchiveLease | null;
  renewResult?: boolean;
  assertError?: Error;
}): IArchiveLeaseStore & { releaseCalls: number } {
  let releaseCalls = 0;
  return {
    get releaseCalls() {
      return releaseCalls;
    },
    async tryAcquire(_workerId, _ttl, _nowIso) {
      return config.acquireResult !== undefined ? config.acquireResult : FAKE_LEASE;
    },
    async renew(_lease, _ttl, _nowIso) {
      return config.renewResult ?? true;
    },
    async release(_lease) {
      releaseCalls++;
    },
    async assertLeaseHeld(_lease, _nowIso) {
      if (config.assertError) {
        throw config.assertError;
      }
    },
  };
}

function buildRecordingTelemetry(): ArchiveLifecycleTelemetry & {
  counters: Record<string, number>;
  infoMessages: string[];
  errorMessages: string[];
} {
  const counters: Record<string, number> = {};
  const infoMessages: string[] = [];
  const errorMessages: string[] = [];
  return {
    counters,
    infoMessages,
    errorMessages,
    metrics: {
      addCounter(name, value) {
        counters[name] = (counters[name] ?? 0) + value;
      },
      recordHistogram(_name, _value) {},
    },
    logger: {
      info(_data, msg) {
        if (msg) infoMessages.push(msg);
      },
      error(_data, msg) {
        if (msg) errorMessages.push(msg);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// markDeleteEligibleUnits
// ---------------------------------------------------------------------------

describe('RunArchiveDeleter.markDeleteEligibleUnits', () => {
  it('returns empty when no VERIFIED units are ready', async () => {
    const store = buildStubDeleteStore({ markDeleteEligibleResult: [] });
    const leaseStore = buildStubLeaseStore({});
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    const results = await deleter.markDeleteEligibleUnits(POLICY);
    expect(results).toHaveLength(0);
  });

  it('returns one entry per transitioned unit', async () => {
    const units = [
      makeDeleteEligibleUnit({ archiveUnitKey: 'tb07_2026_03_19' }),
      makeDeleteEligibleUnit({ archiveUnitKey: 'tb07_2026_03_18' }),
    ];
    const store = buildStubDeleteStore({ markDeleteEligibleResult: units });
    const leaseStore = buildStubLeaseStore({});
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    const results = await deleter.markDeleteEligibleUnits(POLICY);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.archiveUnitKey).sort()).toEqual([
      'tb07_2026_03_18',
      'tb07_2026_03_19',
    ]);
  });

  it('emits units_delete_eligible_total metric', async () => {
    const units = [makeDeleteEligibleUnit()];
    const store = buildStubDeleteStore({ markDeleteEligibleResult: units });
    const leaseStore = buildStubLeaseStore({});
    const telemetry = buildRecordingTelemetry();
    const deleter = new RunArchiveDeleter({ store, leaseStore, telemetry, nowIso: () => NOW });

    await deleter.markDeleteEligibleUnits(POLICY);
    expect(telemetry.counters['dvt.archive.units_delete_eligible_total']).toBe(1);
  });

  it('rejects invalid policy (negative grace days)', async () => {
    const store = buildStubDeleteStore({});
    const leaseStore = buildStubLeaseStore({});
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    await expect(
      deleter.markDeleteEligibleUnits({ ...POLICY, deletionGraceDays: -1 })
    ).rejects.toThrow(/ARCHIVE_DELETION_GRACE_DAYS_INVALID/);
  });

  it('rejects invalid policy (zero maxUnitsPerRun)', async () => {
    const store = buildStubDeleteStore({});
    const leaseStore = buildStubLeaseStore({});
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    await expect(deleter.markDeleteEligibleUnits({ ...POLICY, maxUnitsPerRun: 0 })).rejects.toThrow(
      /ARCHIVE_MAX_UNITS_PER_RUN_INVALID/
    );
  });
});

// ---------------------------------------------------------------------------
// dropEligibleUnits
// ---------------------------------------------------------------------------

describe('RunArchiveDeleter.dropEligibleUnits', () => {
  it('returns empty when lease cannot be acquired', async () => {
    const store = buildStubDeleteStore({});
    const leaseStore = buildStubLeaseStore({ acquireResult: null });
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    const results = await deleter.dropEligibleUnits(POLICY);
    expect(results).toHaveLength(0);
  });

  it('drops each due unit and records a batch', async () => {
    const units = [
      makeDeleteEligibleUnit({ archiveUnitKey: 'tb07_2026_03_19' }),
      makeDeleteEligibleUnit({ archiveUnitKey: 'tb07_2026_03_18' }),
    ];
    const store = buildStubDeleteStore({
      dueForDropResult: units,
      dropResult: { rowsDeleted: 50 },
    });
    const leaseStore = buildStubLeaseStore({});
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    const results = await deleter.dropEligibleUnits(POLICY);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.dropped)).toBe(true);
    expect(results.every((r) => r.rowsDeleted === 50)).toBe(true);
    expect(store.droppedBatches).toHaveLength(2);
  });

  it('releases the lease even if a unit drop throws', async () => {
    const units = [makeDeleteEligibleUnit()];
    const store = buildStubDeleteStore({
      dueForDropResult: units,
      dropError: new Error('disk full'),
    });
    const leaseStore = buildStubLeaseStore({});
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    const results = await deleter.dropEligibleUnits(POLICY);
    expect(results[0].dropped).toBe(false);
    expect(leaseStore.releaseCalls).toBe(1);
  });

  it('aborts remaining drops after ARCHIVE_LEASE_LOST', async () => {
    const units = [
      makeDeleteEligibleUnit({ archiveUnitKey: 'tb07_2026_03_19' }),
      makeDeleteEligibleUnit({ archiveUnitKey: 'tb07_2026_03_18' }),
    ];
    const store = buildStubDeleteStore({ dueForDropResult: units });
    const leaseStore = buildStubLeaseStore({
      assertError: new Error('ARCHIVE_LEASE_LOST'),
    });
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    const results = await deleter.dropEligibleUnits(POLICY);
    // First unit fails with lease lost → loop aborts → only 1 result
    expect(results).toHaveLength(1);
    expect(results[0].dropped).toBe(false);
    expect(store.droppedUnits).toHaveLength(0);
  });

  it('emits units_dropped_total and drop_failures_total metrics', async () => {
    const goodUnit = makeDeleteEligibleUnit({ archiveUnitKey: 'tb07_2026_03_19' });
    const dueForDropResult = [goodUnit];
    const store = buildStubDeleteStore({ dueForDropResult });
    const leaseStore = buildStubLeaseStore({});
    const telemetry = buildRecordingTelemetry();
    const deleter = new RunArchiveDeleter({ store, leaseStore, telemetry, nowIso: () => NOW });

    await deleter.dropEligibleUnits(POLICY);

    expect(telemetry.counters['dvt.archive.units_dropped_total']).toBe(1);
    expect(telemetry.counters['dvt.archive.drop_failures_total']).toBeUndefined();
  });

  it('emits drop_failures_total when a drop fails', async () => {
    const units = [makeDeleteEligibleUnit()];
    const store = buildStubDeleteStore({
      dueForDropResult: units,
      dropError: new Error('disk full'),
    });
    const leaseStore = buildStubLeaseStore({});
    const telemetry = buildRecordingTelemetry();
    const deleter = new RunArchiveDeleter({ store, leaseStore, telemetry, nowIso: () => NOW });

    await deleter.dropEligibleUnits(POLICY);

    expect(telemetry.counters['dvt.archive.drop_failures_total']).toBe(1);
    expect(telemetry.errorMessages).toContain('archive unit drop failed');
  });

  it('validates policy before acquiring lease', async () => {
    const store = buildStubDeleteStore({});
    const leaseStore = buildStubLeaseStore({});
    const acquireSpy = vi.fn().mockResolvedValue(null);
    leaseStore.tryAcquire = acquireSpy;
    const deleter = new RunArchiveDeleter({ store, leaseStore, nowIso: () => NOW });

    await expect(deleter.dropEligibleUnits({ ...POLICY, workerId: '  ' })).rejects.toThrow(
      /ARCHIVE_WORKER_ID_REQUIRED/
    );
    expect(acquireSpy).not.toHaveBeenCalled();
  });
});
