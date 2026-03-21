import type { EventEnvelope } from '@dvt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
  ArchiveObjectWriteResult,
  IArchiveObjectStore,
} from '../src/lifecycle/archiveRuntime.js';
import { ObjectStorageRunArchiveExporter } from '../src/lifecycle/ObjectStorageRunArchiveExporter.js';

// ---------------------------------------------------------------------------
// In-memory object store for unit tests
// ---------------------------------------------------------------------------

class InMemoryArchiveObjectStore implements IArchiveObjectStore {
  readonly objects = new Map<string, Buffer>();
  readonly putCalls: string[] = [];

  async putObject(
    objectKey: string,
    content: Buffer,
    _contentType: string
  ): Promise<ArchiveObjectWriteResult> {
    this.putCalls.push(objectKey);
    this.objects.set(objectKey, Buffer.from(content));
    return { objectKey, uri: `mem://${objectKey}` };
  }

  async readObject(objectKey: string): Promise<Buffer> {
    const buf = this.objects.get(objectKey);
    if (!buf) {
      throw new Error(`OBJECT_NOT_FOUND: ${objectKey}`);
    }
    return buf;
  }

  async existsObject(objectKey: string): Promise<boolean> {
    return this.objects.has(objectKey);
  }

  delete(objectKey: string): void {
    this.objects.delete(objectKey);
  }
}

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

const ARCHIVE_UNIT_KEY = 'tb07_2026_03_19';
const TENANT_BUCKET = 'tb07';
const EXPORTED_AT = '2026-03-20T00:00:00.000Z';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ObjectStorageRunArchiveExporter', () => {
  let store: InMemoryArchiveObjectStore;
  let exporter: ObjectStorageRunArchiveExporter;

  beforeEach(() => {
    store = new InMemoryArchiveObjectStore();
    exporter = new ObjectStorageRunArchiveExporter({ objectStore: store, prefix: 'archive' });
  });

  describe('exportArchiveUnit', () => {
    it('writes three objects: events.jsonl, manifest.json, checksum.sha256', async () => {
      const events = [
        makeEvent({ runId: 'run-a', runSeq: 1 }),
        makeEvent({ runId: 'run-a', runSeq: 2 }),
      ];

      await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });

      expect(store.putCalls).toHaveLength(3);
      expect(store.putCalls).toContain(`archive/${ARCHIVE_UNIT_KEY}/events.jsonl`);
      expect(store.putCalls).toContain(`archive/${ARCHIVE_UNIT_KEY}/manifest.json`);
      expect(store.putCalls).toContain(`archive/${ARCHIVE_UNIT_KEY}/checksum.sha256`);
    });

    it('returns a result with consistent metadata', async () => {
      const events = [
        makeEvent({ runId: 'run-a', runSeq: 1 }),
        makeEvent({ runId: 'run-b', runSeq: 5 }),
      ];

      const result = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });

      expect(result.archiveUnitKey).toBe(ARCHIVE_UNIT_KEY);
      expect(result.tenantBucket).toBe(TENANT_BUCKET);
      expect(result.rowCount).toBe(2);
      expect(result.minRunSeq).toBe(1);
      expect(result.maxRunSeq).toBe(5);
      expect(result.exportedAtIso).toBe(EXPORTED_AT);
      expect(result.checksumSha256).toBeTruthy();
      expect(result.manifestSha256).toBeTruthy();
      expect(result.objectKey).toBe(`archive/${ARCHIVE_UNIT_KEY}/events.jsonl`);
      expect(result.objectUri).toBe(`mem://archive/${ARCHIVE_UNIT_KEY}/events.jsonl`);
    });

    it('produces deterministic checksums regardless of input event order', async () => {
      const events = [
        makeEvent({ runId: 'run-a', tenantId: 'tenant-b', runSeq: 2 }),
        makeEvent({ runId: 'run-b', tenantId: 'tenant-a', runSeq: 7 }),
        makeEvent({ runId: 'run-a', tenantId: 'tenant-b', runSeq: 1 }),
      ];
      const shuffled = [events[1], events[0], events[2]];

      const storeA = new InMemoryArchiveObjectStore();
      const storeB = new InMemoryArchiveObjectStore();
      const expA = new ObjectStorageRunArchiveExporter({ objectStore: storeA, prefix: 'archive' });
      const expB = new ObjectStorageRunArchiveExporter({ objectStore: storeB, prefix: 'archive' });

      const resultA = await expA.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });
      const resultB = await expB.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events: shuffled,
      });

      expect(resultA.checksumSha256).toBe(resultB.checksumSha256);
      expect(resultA.manifestSha256).toBe(resultB.manifestSha256);
      expect(storeA.objects.get(`archive/${ARCHIVE_UNIT_KEY}/events.jsonl`)).toEqual(
        storeB.objects.get(`archive/${ARCHIVE_UNIT_KEY}/events.jsonl`)
      );
    });

    it('includes tenant ids from all events in the manifest', async () => {
      const events = [
        makeEvent({ tenantId: 'tenant-z', runId: 'run-1', runSeq: 1 }),
        makeEvent({ tenantId: 'tenant-a', runId: 'run-2', runSeq: 1 }),
        makeEvent({ tenantId: 'tenant-m', runId: 'run-3', runSeq: 1 }),
      ];

      const result = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });

      expect(result.tenantIds).toEqual(['tenant-a', 'tenant-m', 'tenant-z']);
    });

    it('uses a default prefix of "archive" when none is provided', async () => {
      const exp = new ObjectStorageRunArchiveExporter({ objectStore: store });
      const events = [makeEvent()];

      await exp.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });

      expect(store.putCalls[0]).toMatch(/^archive\//);
    });
  });

  describe('verifyArchiveUnit', () => {
    it('resolves without error when all objects are present and checksums match', async () => {
      const events = [
        makeEvent({ runId: 'run-a', runSeq: 1 }),
        makeEvent({ runId: 'run-a', runSeq: 2 }),
      ];
      const exported = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });

      await expect(
        exporter.verifyArchiveUnit({
          archiveUnitKey: ARCHIVE_UNIT_KEY,
          tenantBucket: TENANT_BUCKET,
          expectedRowCount: exported.rowCount,
          expectedChecksumSha256: exported.checksumSha256,
          objectKey: exported.objectKey,
        })
      ).resolves.toBeUndefined();
    });

    it('rejects with ARCHIVE_VERIFICATION_OBJECTS_MISSING when events object is absent', async () => {
      const events = [makeEvent()];
      const exported = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });
      store.delete(exported.objectKey);

      await expect(
        exporter.verifyArchiveUnit({
          archiveUnitKey: ARCHIVE_UNIT_KEY,
          tenantBucket: TENANT_BUCKET,
          expectedRowCount: exported.rowCount,
          expectedChecksumSha256: exported.checksumSha256,
          objectKey: exported.objectKey,
        })
      ).rejects.toThrow(/ARCHIVE_VERIFICATION_OBJECTS_MISSING/);
    });

    it('rejects with ARCHIVE_VERIFICATION_OBJECTS_MISSING when manifest is absent', async () => {
      const events = [makeEvent()];
      const exported = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });
      store.delete(exported.manifestObjectKey);

      await expect(
        exporter.verifyArchiveUnit({
          archiveUnitKey: ARCHIVE_UNIT_KEY,
          tenantBucket: TENANT_BUCKET,
          expectedRowCount: exported.rowCount,
          expectedChecksumSha256: exported.checksumSha256,
          objectKey: exported.objectKey,
        })
      ).rejects.toThrow(/ARCHIVE_VERIFICATION_OBJECTS_MISSING/);
    });

    it('rejects with ARCHIVE_MANIFEST_CHECKSUM_MISMATCH when checksum file is tampered', async () => {
      const events = [makeEvent()];
      const exported = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });
      store.objects.set(exported.checksumObjectKey, Buffer.from('deadbeef\n', 'utf8'));

      await expect(
        exporter.verifyArchiveUnit({
          archiveUnitKey: ARCHIVE_UNIT_KEY,
          tenantBucket: TENANT_BUCKET,
          expectedRowCount: exported.rowCount,
          expectedChecksumSha256: exported.checksumSha256,
          objectKey: exported.objectKey,
        })
      ).rejects.toThrow(/ARCHIVE_MANIFEST_CHECKSUM_MISMATCH/);
    });

    it('rejects with ARCHIVE_MANIFEST_ROW_COUNT_MISMATCH when expected row count does not match', async () => {
      const events = [makeEvent({ runSeq: 1 }), makeEvent({ runSeq: 2 })];
      const exported = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });

      await expect(
        exporter.verifyArchiveUnit({
          archiveUnitKey: ARCHIVE_UNIT_KEY,
          tenantBucket: TENANT_BUCKET,
          expectedRowCount: 999,
          expectedChecksumSha256: exported.checksumSha256,
          objectKey: exported.objectKey,
        })
      ).rejects.toThrow(/ARCHIVE_MANIFEST_ROW_COUNT_MISMATCH/);
    });

    it('rejects with ARCHIVE_MANIFEST_EVENT_CHECKSUM_MISMATCH when expected checksum differs', async () => {
      const events = [makeEvent()];
      const exported = await exporter.exportArchiveUnit({
        archiveUnitKey: ARCHIVE_UNIT_KEY,
        tenantBucket: TENANT_BUCKET,
        exportedAtIso: EXPORTED_AT,
        events,
      });

      await expect(
        exporter.verifyArchiveUnit({
          archiveUnitKey: ARCHIVE_UNIT_KEY,
          tenantBucket: TENANT_BUCKET,
          expectedRowCount: exported.rowCount,
          expectedChecksumSha256: 'a'.repeat(64),
          objectKey: exported.objectKey,
        })
      ).rejects.toThrow(/ARCHIVE_MANIFEST_EVENT_CHECKSUM_MISMATCH/);
    });
  });

  describe('destinationKind', () => {
    it('reports "file" for non-S3 object stores', () => {
      expect(exporter.destinationKind).toBe('file');
    });

    it('reports "s3" for S3-named object stores', () => {
      const s3Store = new (class S3ArchiveObjectStore extends InMemoryArchiveObjectStore {})();
      const s3Exporter = new ObjectStorageRunArchiveExporter({ objectStore: s3Store });
      expect(s3Exporter.destinationKind).toBe('s3');
    });
  });
});
