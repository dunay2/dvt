import type { EventEnvelope } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type {
  ArchiveLifecycleTelemetry,
  ArchiveObjectWriteResult,
  ArchiveRestoreResult,
  ArchiveRunRestoreRequest,
  ArchiveUnitRestoreRequest,
  IArchiveObjectStore,
  IRunArchiveRestoreStore,
  RestoreLogRecord,
} from '../src/lifecycle/archiveRuntime.js';
import { ObjectStorageRunArchiveExporter } from '../src/lifecycle/ObjectStorageRunArchiveExporter.js';
import { RunArchiveRestorer } from '../src/lifecycle/RunArchiveRestorer.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = '2026-04-20T00:00:00.000Z';

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

// ---------------------------------------------------------------------------
// In-memory object store
// ---------------------------------------------------------------------------

class InMemoryArchiveObjectStore implements IArchiveObjectStore {
  readonly objects = new Map<string, Buffer>();

  async putObject(
    objectKey: string,
    content: Buffer,
    _contentType: string
  ): Promise<ArchiveObjectWriteResult> {
    this.objects.set(objectKey, Buffer.from(content));
    return { objectKey, uri: `mem://${objectKey}` };
  }

  async readObject(objectKey: string): Promise<Buffer> {
    const buf = this.objects.get(objectKey);
    if (!buf) throw new Error(`OBJECT_NOT_FOUND: ${objectKey}`);
    return buf;
  }

  async existsObject(objectKey: string): Promise<boolean> {
    return this.objects.has(objectKey);
  }
}

// ---------------------------------------------------------------------------
// Stub restore store
// ---------------------------------------------------------------------------

function buildStubRestoreStore(
  config: {
    writeError?: Error;
    startError?: Error;
  } = {}
): IRunArchiveRestoreStore & {
  logs: Array<Omit<RestoreLogRecord, 'status'>>;
  completed: Array<{ restoreId: string; rowsRestored: number }>;
  failed: Array<{ restoreId: string; error: string }>;
  writtenEvents: EventEnvelope[];
} {
  const logs: Array<Omit<RestoreLogRecord, 'status'>> = [];
  const completed: Array<{ restoreId: string; rowsRestored: number }> = [];
  const failed: Array<{ restoreId: string; error: string }> = [];
  const writtenEvents: EventEnvelope[] = [];

  return {
    logs,
    completed,
    failed,
    writtenEvents,

    async startRestoreLog(input) {
      if (config.startError) throw config.startError;
      logs.push(input);
      return { ...input, status: 'STARTED' as const };
    },
    async markRestoreCompleted(restoreId, rowsRestored, _completedAtIso) {
      completed.push({ restoreId, rowsRestored });
    },
    async markRestoreFailed(restoreId, error, _failedAtIso) {
      failed.push({ restoreId, error });
    },
    async writeRestoredEvents(events, _targetSchema) {
      if (config.writeError) throw config.writeError;
      writtenEvents.push(...(events as EventEnvelope[]));
      return events.length;
    },
    async getExportedBatchForUnit(_archiveUnitKey) {
      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

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
      recordHistogram() {},
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
// Test helpers for pre-populating object store
// ---------------------------------------------------------------------------

async function writeEventsToStore(
  objectStore: InMemoryArchiveObjectStore,
  events: EventEnvelope[],
  objectKey: string
): Promise<void> {
  // Use the same NDJSON encoding as the exporter
  const exporter = new ObjectStorageRunArchiveExporter({ objectStore, prefix: '' });
  // We can't call exportArchiveUnit directly (it validates the unit key),
  // so we write the NDJSON directly for test purposes:
  const { jcsCanonicalize } = await import('@dvt/crypto');
  const content = events.map((e) => jcsCanonicalize(e)).join('\n') + '\n';
  objectStore.objects.set(objectKey, Buffer.from(content, 'utf8'));
  void exporter; // suppress unused warning
}

// ---------------------------------------------------------------------------
// RunArchiveRestorer.restoreRun
// ---------------------------------------------------------------------------

describe('RunArchiveRestorer.restoreRun', () => {
  const OBJECT_KEY = 'archive/tb07_2026_03_19/events.jsonl';

  function makeRunRequest(
    overrides: Partial<ArchiveRunRestoreRequest> = {}
  ): ArchiveRunRestoreRequest {
    return {
      restoreId: 'restore-1',
      runId: 'run-a',
      archiveUnitKey: 'tb07_2026_03_19',
      objectKey: OBJECT_KEY,
      targetSchema: 'restore_temp',
      requesterId: 'ops-user',
      reason: 'incident recovery',
      startedAtIso: NOW,
      ...overrides,
    };
  }

  it('restores events for a specific run and marks log COMPLETED', async () => {
    const events = [
      makeEvent({ runId: 'run-a', runSeq: 1 }),
      makeEvent({ runId: 'run-a', runSeq: 2 }),
      makeEvent({ runId: 'run-b', runSeq: 1 }), // should not be restored
    ];
    const objectStore = new InMemoryArchiveObjectStore();
    await writeEventsToStore(objectStore, events, OBJECT_KEY);

    const store = buildStubRestoreStore();
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    const result: ArchiveRestoreResult = await restorer.restoreRun(makeRunRequest());

    expect(result.rowsRestored).toBe(2);
    expect(result.restoreId).toBe('restore-1');
    expect(store.writtenEvents.every((e) => e.runId === 'run-a')).toBe(true);
    expect(store.completed).toHaveLength(1);
    expect(store.completed[0].restoreId).toBe('restore-1');
    expect(store.failed).toHaveLength(0);
  });

  it('throws ARCHIVE_RESTORE_RUN_NOT_FOUND when runId has no events in the unit', async () => {
    const events = [makeEvent({ runId: 'run-other', runSeq: 1 })];
    const objectStore = new InMemoryArchiveObjectStore();
    await writeEventsToStore(objectStore, events, OBJECT_KEY);

    const store = buildStubRestoreStore();
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    await expect(restorer.restoreRun(makeRunRequest({ runId: 'run-missing' }))).rejects.toThrow(
      /ARCHIVE_RESTORE_RUN_NOT_FOUND/
    );

    expect(store.failed).toHaveLength(1);
    expect(store.failed[0].restoreId).toBe('restore-1');
  });

  it('marks log FAILED and rethrows when object store throws', async () => {
    const objectStore = new InMemoryArchiveObjectStore(); // empty — missing object
    const store = buildStubRestoreStore();
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    await expect(restorer.restoreRun(makeRunRequest())).rejects.toThrow();
    expect(store.failed).toHaveLength(1);
  });

  it('emits restore_completed_total metric on success', async () => {
    const events = [makeEvent({ runId: 'run-a', runSeq: 1 })];
    const objectStore = new InMemoryArchiveObjectStore();
    await writeEventsToStore(objectStore, events, OBJECT_KEY);

    const store = buildStubRestoreStore();
    const telemetry = buildRecordingTelemetry();
    const restorer = new RunArchiveRestorer({ store, objectStore, telemetry, nowIso: () => NOW });

    await restorer.restoreRun(makeRunRequest());
    expect(telemetry.counters['dvt.archive.restore_completed_total']).toBe(1);
  });

  it('emits restore_failed_total metric on failure', async () => {
    const objectStore = new InMemoryArchiveObjectStore();
    const store = buildStubRestoreStore();
    const telemetry = buildRecordingTelemetry();
    const restorer = new RunArchiveRestorer({ store, objectStore, telemetry, nowIso: () => NOW });

    await expect(restorer.restoreRun(makeRunRequest())).rejects.toThrow();
    expect(telemetry.counters['dvt.archive.restore_failed_total']).toBe(1);
    expect(telemetry.errorMessages).toContain('archive run restore failed');
  });

  it('records the restore log entry with correct metadata', async () => {
    const events = [makeEvent({ runId: 'run-a', runSeq: 1 })];
    const objectStore = new InMemoryArchiveObjectStore();
    await writeEventsToStore(objectStore, events, OBJECT_KEY);

    const store = buildStubRestoreStore();
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    await restorer.restoreRun(makeRunRequest());

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0].requesterId).toBe('ops-user');
    expect(store.logs[0].reason).toBe('incident recovery');
    expect(store.logs[0].runId).toBe('run-a');
    expect(store.logs[0].targetSchema).toBe('restore_temp');
  });
});

// ---------------------------------------------------------------------------
// RunArchiveRestorer.restoreArchiveUnit
// ---------------------------------------------------------------------------

describe('RunArchiveRestorer.restoreArchiveUnit', () => {
  const OBJECT_KEY = 'archive/tb07_2026_03_19/events.jsonl';

  function makeUnitRequest(
    overrides: Partial<ArchiveUnitRestoreRequest> = {}
  ): ArchiveUnitRestoreRequest {
    return {
      restoreId: 'restore-unit-1',
      archiveUnitKey: 'tb07_2026_03_19',
      objectKey: OBJECT_KEY,
      targetSchema: 'restore_temp',
      requesterId: 'ops-user',
      reason: 'full unit recovery',
      startedAtIso: NOW,
      ...overrides,
    };
  }

  it('restores all events in the unit', async () => {
    const events = [
      makeEvent({ runId: 'run-a', runSeq: 1 }),
      makeEvent({ runId: 'run-b', runSeq: 1 }),
      makeEvent({ runId: 'run-c', runSeq: 1 }),
    ];
    const objectStore = new InMemoryArchiveObjectStore();
    await writeEventsToStore(objectStore, events, OBJECT_KEY);

    const store = buildStubRestoreStore();
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    const result = await restorer.restoreArchiveUnit(makeUnitRequest());

    expect(result.rowsRestored).toBe(3);
    expect(store.writtenEvents).toHaveLength(3);
    expect(store.completed).toHaveLength(1);
  });

  it('throws ARCHIVE_RESTORE_UNIT_EMPTY when the object is empty', async () => {
    const objectStore = new InMemoryArchiveObjectStore();
    // Write an effectively-empty file
    objectStore.objects.set(OBJECT_KEY, Buffer.from('\n\n', 'utf8'));

    const store = buildStubRestoreStore();
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    await expect(restorer.restoreArchiveUnit(makeUnitRequest())).rejects.toThrow(
      /ARCHIVE_RESTORE_UNIT_EMPTY|ARCHIVE_EVENTS_REQUIRED/
    );
    expect(store.failed).toHaveLength(1);
  });

  it('records the restore log with null runId', async () => {
    const events = [makeEvent({ runId: 'run-a', runSeq: 1 })];
    const objectStore = new InMemoryArchiveObjectStore();
    await writeEventsToStore(objectStore, events, OBJECT_KEY);

    const store = buildStubRestoreStore();
    const restorer = new RunArchiveRestorer({ store, objectStore, nowIso: () => NOW });

    await restorer.restoreArchiveUnit(makeUnitRequest());

    expect(store.logs[0].runId).toBeNull();
    expect(store.logs[0].archiveUnitKey).toBe('tb07_2026_03_19');
  });
});
