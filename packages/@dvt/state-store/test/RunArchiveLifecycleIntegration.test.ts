import type { EventEnvelope, WorkflowSnapshot } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type {
  ArchivedTerminalSnapshot,
  TerminalSnapshotPinResult,
} from '../src/lifecycle/archiveArtifacts.js';
import type {
  ArchiveBatchDroppedRecord,
  ArchiveBatchExportedRecord,
  ArchiveBatchFailureRecord,
  ArchiveBatchRecord,
  ArchiveBatchVerifiedRecord,
  ArchiveLease,
  ArchiveRunRestoreRequest,
  DeleteEligibleArchiveUnit,
  EligibleArchiveUnit,
  IArchiveLeaseStore,
  IRunArchiveDeleteStore,
  IRunArchiveRestoreStore,
  IRunArchiveStore,
  PendingArchiveVerification,
  RunArchiveDeletionPolicy,
  RunEventRetentionPolicy,
} from '../src/lifecycle/archiveRuntime.js';
import { ObjectStorageRunArchiveExporter } from '../src/lifecycle/ObjectStorageRunArchiveExporter.js';
import { RunArchiveCoordinator } from '../src/lifecycle/RunArchiveCoordinator.js';
import { RunArchiveDeleter } from '../src/lifecycle/RunArchiveDeleter.js';
import { RunArchiveRestorer } from '../src/lifecycle/RunArchiveRestorer.js';
import { RunArchiveVerifier } from '../src/lifecycle/RunArchiveVerifier.js';

const NOW = '2026-04-20T00:00:00.000Z';

const RETENTION_POLICY: RunEventRetentionPolicy = {
  hotRetentionDays: 30,
  archiveBucketCount: 64,
  pinTerminalSnapshots: false,
};

const DELETE_POLICY: RunArchiveDeletionPolicy = {
  deletionGraceDays: 0,
  maxUnitsPerRun: 10,
  leaseTimeoutSeconds: 60,
  workerId: 'retention-worker-1',
};

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
    payloadVersion: 1,
    runSeq: 1,
    persistedAt: '2026-03-19T08:00:00.000Z',
    ...overrides,
  };
}

class InMemoryArchiveLifecycleStore
  implements IRunArchiveStore, IRunArchiveDeleteStore, IRunArchiveRestoreStore
{
  private readonly unit: EligibleArchiveUnit = {
    archiveUnitKey: 'tb07_2026_03_19',
    tenantBucket: 'tb07',
    tenantIds: ['tenant-a'],
    rowCount: 2,
    minRunSeq: 1,
    maxRunSeq: 2,
    state: 'ELIGIBLE',
  };

  private unitState:
    | 'ELIGIBLE'
    | 'EXPORTED'
    | 'FAILED'
    | 'VERIFIED'
    | 'VERIFY_FAILED'
    | 'DELETE_ELIGIBLE' = 'ELIGIBLE';
  private deleteAfterIso: string | null = null;
  private exportedBatch: ArchiveBatchExportedRecord | null = null;
  private readonly hotEvents: EventEnvelope[];
  private readonly restoredEvents: EventEnvelope[] = [];

  constructor(
    events: EventEnvelope[],
    private readonly corruptVerificationChecksum = false
  ) {
    this.hotEvents = [...events];
  }

  get hotCount(): number {
    return this.hotEvents.length;
  }

  get restoredCount(): number {
    return this.restoredEvents.length;
  }

  get unitObjectKey(): string {
    if (!this.exportedBatch) {
      throw new Error('EXPORTED_BATCH_REQUIRED');
    }
    return this.exportedBatch.objectKey;
  }

  async listEligibleArchiveUnits(): Promise<readonly EligibleArchiveUnit[]> {
    if (this.unitState !== 'ELIGIBLE') {
      return [];
    }
    return [this.unit];
  }

  async startArchiveBatch(
    archiveUnitKey: string,
    startedAtIso: string
  ): Promise<ArchiveBatchRecord> {
    return {
      batchId: `batch-${archiveUnitKey}`,
      archiveUnitKey,
      startedAt: startedAtIso,
      status: 'STARTED',
    };
  }

  async loadArchiveUnitEvents(): Promise<readonly EventEnvelope[]> {
    return [...this.hotEvents];
  }

  async listTerminalSnapshotsForArchiveUnit(): Promise<[]> {
    return [];
  }

  async markArchiveBatchExported(record: ArchiveBatchExportedRecord): Promise<void> {
    this.exportedBatch = record;
    this.unitState = 'EXPORTED';
  }

  async markArchiveBatchFailed(_record: ArchiveBatchFailureRecord): Promise<void> {
    this.unitState = 'FAILED';
  }

  async listArchiveUnitsPendingVerification(): Promise<readonly PendingArchiveVerification[]> {
    if (this.unitState !== 'EXPORTED' || !this.exportedBatch) {
      return [];
    }

    return [
      {
        batchId: this.exportedBatch.batchId,
        archiveUnitKey: this.exportedBatch.archiveUnitKey,
        tenantBucket: this.exportedBatch.tenantBucket,
        tenantIds: this.exportedBatch.tenantIds,
        rowCount: this.exportedBatch.rowCount,
        minRunSeq: this.exportedBatch.minRunSeq,
        maxRunSeq: this.exportedBatch.maxRunSeq,
        objectKey: this.exportedBatch.objectKey,
        checksumSha256: this.corruptVerificationChecksum
          ? 'f'.repeat(64)
          : this.exportedBatch.checksumSha256,
        exportedAtIso: this.exportedBatch.exportedAtIso,
      },
    ];
  }

  async markArchiveBatchVerified(_record: ArchiveBatchVerifiedRecord): Promise<void> {
    this.unitState = 'VERIFIED';
  }

  async markArchiveBatchVerifyFailed(_record: ArchiveBatchFailureRecord): Promise<void> {
    this.unitState = 'VERIFY_FAILED';
  }

  async pinTerminalSnapshot(
    _snapshot: ArchivedTerminalSnapshot
  ): Promise<TerminalSnapshotPinResult> {
    return {
      outcome: 'APPLIED',
      tenantId: 'tenant-a',
      runId: 'run-a',
      archiveUnitKey: this.unit.archiveUnitKey,
      incomingLastRunSeq: 2,
      storedLastRunSeq: 2,
    };
  }

  async getPinnedTerminalSnapshot(
    _tenantId: string,
    _runId: string
  ): Promise<{
    tenantId: string;
    runId: string;
    archiveUnitKey: string;
    archivedAtIso: string;
    status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    lastRunSeq: number;
    eventChecksumSha256: string;
    snapshot: WorkflowSnapshot;
  } | null> {
    return null;
  }

  async markDeleteEligibleUnits(
    _policy: RunArchiveDeletionPolicy,
    nowIso: string
  ): Promise<readonly DeleteEligibleArchiveUnit[]> {
    if (this.unitState !== 'VERIFIED' || !this.exportedBatch) {
      return [];
    }
    this.unitState = 'DELETE_ELIGIBLE';
    this.deleteAfterIso = nowIso;

    return [
      {
        archiveUnitKey: this.exportedBatch.archiveUnitKey,
        tenantBucket: this.exportedBatch.tenantBucket,
        tenantIds: this.exportedBatch.tenantIds,
        rowCount: this.exportedBatch.rowCount,
        objectKey: this.exportedBatch.objectKey,
        verifiedAtIso: nowIso,
        deleteAfterIso: nowIso,
        state: 'DELETE_ELIGIBLE',
      },
    ];
  }

  async listDueForDrop(
    _policy: RunArchiveDeletionPolicy,
    nowIso: string
  ): Promise<readonly DeleteEligibleArchiveUnit[]> {
    if (
      this.unitState !== 'DELETE_ELIGIBLE' ||
      !this.exportedBatch ||
      !this.deleteAfterIso ||
      this.deleteAfterIso > nowIso
    ) {
      return [];
    }
    return [
      {
        archiveUnitKey: this.exportedBatch.archiveUnitKey,
        tenantBucket: this.exportedBatch.tenantBucket,
        tenantIds: this.exportedBatch.tenantIds,
        rowCount: this.exportedBatch.rowCount,
        objectKey: this.exportedBatch.objectKey,
        verifiedAtIso: nowIso,
        deleteAfterIso: this.deleteAfterIso,
        state: 'DELETE_ELIGIBLE',
      },
    ];
  }

  async dropHotArchiveUnit(
    _archiveUnitKey: string,
    _droppedAtIso: string
  ): Promise<{ rowsDeleted: number }> {
    const rowsDeleted = this.hotEvents.length;
    this.hotEvents.splice(0, this.hotEvents.length);
    return { rowsDeleted };
  }

  async markArchiveBatchDropped(_record: ArchiveBatchDroppedRecord): Promise<void> {
    // No-op for test state.
  }

  async startRestoreLog(
    input: Omit<
      {
        restoreId: string;
        archiveUnitKey: string | null;
        runId: string | null;
        targetSchema: string;
        requesterId: string;
        reason: string;
        status: 'STARTED';
        startedAt: string;
      },
      'status'
    >
  ): Promise<{
    restoreId: string;
    archiveUnitKey: string | null;
    runId: string | null;
    targetSchema: string;
    requesterId: string;
    reason: string;
    status: 'STARTED';
    startedAt: string;
  }> {
    return { ...input, status: 'STARTED' };
  }

  async markRestoreCompleted(
    _restoreId: string,
    _rowsRestored: number,
    _completedAtIso: string
  ): Promise<void> {}

  async markRestoreFailed(
    _restoreId: string,
    _error: string,
    _failedAtIso: string
  ): Promise<void> {}

  async writeRestoredEvents(
    events: readonly EventEnvelope[],
    _targetSchema: string
  ): Promise<number> {
    this.restoredEvents.push(...events);
    this.hotEvents.push(...events);
    return events.length;
  }

  async getExportedBatchForUnit(archiveUnitKey: string): Promise<{
    batchId: string;
    objectKey: string;
    tenantBucket: string;
  } | null> {
    if (!this.exportedBatch || this.exportedBatch.archiveUnitKey !== archiveUnitKey) {
      return null;
    }
    return {
      batchId: this.exportedBatch.batchId,
      objectKey: this.exportedBatch.objectKey,
      tenantBucket: this.exportedBatch.tenantBucket,
    };
  }
}

class InMemoryLeaseStore implements IArchiveLeaseStore {
  async tryAcquire(workerId: string, ttlSeconds: number, nowIso: string): Promise<ArchiveLease> {
    return {
      workerId,
      leaseToken: 'lease-1',
      acquiredAt: nowIso,
      expiresAt: new Date(Date.parse(nowIso) + ttlSeconds * 1000).toISOString(),
    };
  }

  async renew(_lease: ArchiveLease, _ttlSeconds: number, _nowIso: string): Promise<true> {
    return true;
  }

  async release(_lease: ArchiveLease): Promise<void> {}

  async assertLeaseHeld(_lease: ArchiveLease, _nowIso: string): Promise<void> {}
}

describe('Run archive lifecycle integration', () => {
  it('enforces verify gate before delete and supports restore after drop', async () => {
    const initialEvents = [makeEvent({ runSeq: 1 }), makeEvent({ eventId: 'event-2', runSeq: 2 })];
    const store = new InMemoryArchiveLifecycleStore(initialEvents);
    const objectStore = new (class {
      readonly objects = new Map<string, Buffer>();
      async putObject(objectKey: string, content: Buffer) {
        this.objects.set(objectKey, Buffer.from(content));
        return { objectKey, uri: `mem://${objectKey}` };
      }
      async readObject(objectKey: string) {
        const value = this.objects.get(objectKey);
        if (!value) throw new Error(`OBJECT_NOT_FOUND: ${objectKey}`);
        return value;
      }
      async existsObject(objectKey: string) {
        return this.objects.has(objectKey);
      }
    })();

    const exporter = new ObjectStorageRunArchiveExporter({ objectStore, prefix: 'archive' });
    const coordinator = new RunArchiveCoordinator({ store, exporter, nowIso: () => NOW });
    const verifier = new RunArchiveVerifier({ store, exporter, nowIso: () => NOW });
    const deleter = new RunArchiveDeleter({
      store,
      leaseStore: new InMemoryLeaseStore(),
      nowIso: () => NOW,
    });
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    await coordinator.archiveEligibleHotData(RETENTION_POLICY);

    const preVerifyEligible = await deleter.markDeleteEligibleUnits(DELETE_POLICY);
    expect(preVerifyEligible).toHaveLength(0);

    const verifyResults = await verifier.verifyExportedArchiveUnits();
    expect(verifyResults).toEqual([
      { archiveUnitKey: 'tb07_2026_03_19', batchId: 'batch-tb07_2026_03_19', verified: true },
    ]);

    const postVerifyEligible = await deleter.markDeleteEligibleUnits(DELETE_POLICY);
    expect(postVerifyEligible).toHaveLength(1);

    const dropResults = await deleter.dropEligibleUnits(DELETE_POLICY);
    expect(dropResults).toEqual([
      { archiveUnitKey: 'tb07_2026_03_19', dropped: true, rowsDeleted: 2 },
    ]);
    expect(store.hotCount).toBe(0);

    const restoreRequest: ArchiveRunRestoreRequest = {
      restoreId: 'restore-1',
      runId: 'run-a',
      archiveUnitKey: 'tb07_2026_03_19',
      objectKey: store.unitObjectKey,
      targetSchema: 'restore_temp',
      requesterId: 'ops-user',
      reason: 'disaster-recovery',
      startedAtIso: NOW,
    };
    const restoreResult = await restorer.restoreRun(restoreRequest);

    expect(restoreResult.rowsRestored).toBe(2);
    expect(store.restoredCount).toBe(2);
    expect(store.hotCount).toBe(2);
  });

  it('keeps delete blocked when verification fails', async () => {
    const store = new InMemoryArchiveLifecycleStore([makeEvent({ runSeq: 1 })], true);
    const objectStore = new (class {
      readonly objects = new Map<string, Buffer>();
      async putObject(objectKey: string, content: Buffer) {
        this.objects.set(objectKey, Buffer.from(content));
        return { objectKey, uri: `mem://${objectKey}` };
      }
      async readObject(objectKey: string) {
        const value = this.objects.get(objectKey);
        if (!value) throw new Error(`OBJECT_NOT_FOUND: ${objectKey}`);
        return value;
      }
      async existsObject(objectKey: string) {
        return this.objects.has(objectKey);
      }
    })();

    const exporter = new ObjectStorageRunArchiveExporter({ objectStore, prefix: 'archive' });
    const coordinator = new RunArchiveCoordinator({ store, exporter, nowIso: () => NOW });
    const verifier = new RunArchiveVerifier({ store, exporter, nowIso: () => NOW });
    const deleter = new RunArchiveDeleter({
      store,
      leaseStore: new InMemoryLeaseStore(),
      nowIso: () => NOW,
    });

    await coordinator.archiveEligibleHotData(RETENTION_POLICY);
    const verifyResults = await verifier.verifyExportedArchiveUnits();
    expect(verifyResults[0]?.verified).toBe(false);

    const postVerifyEligible = await deleter.markDeleteEligibleUnits(DELETE_POLICY);
    expect(postVerifyEligible).toHaveLength(0);
  });
});
