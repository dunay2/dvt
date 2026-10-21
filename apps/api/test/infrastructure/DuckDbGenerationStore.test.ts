/** @ownedConcern Prove generation publication against the pinned native DuckDB, not a SQL mock. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createLocalDatasetIdV1,
  createLocalDataCaptureIdV1,
  createLocalDataRequestFingerprintV1,
  createLocalDataSchemaDigestV1,
  type LocalDataAcquisitionRequestV1,
  LocalDataAcquisitionRequestV1Schema,
} from '@dvt/contracts';
import { afterEach, beforeEach, describe, it } from 'vitest';

import { DuckDbGenerationStore } from '../../src/infrastructure/duckdb/DuckDbGenerationStore.js';
import { DuckDbLocalDataRuntime } from '../../src/infrastructure/duckdb/DuckDbLocalDataRuntime.js';
import type { LocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const limits = { maxRows: 1000, maxLogicalBytes: 1048576 };
const rows = [
  [9007199254740993n, 'hola 👋', true],
  [2n, null, false],
  [2n, 'duplicate', true],
];
const request: LocalDataAcquisitionRequestV1 = LocalDataAcquisitionRequestV1Schema.parse({
  schemaVersion: 'local-data-acquisition-request.v1',
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: { schemaVersion: 'connection-ref.v1', connectionId: 'pg', provider: 'postgres' },
    sourceObjectId: 'table:public:orders',
  },
  policy: { kind: 'full' },
  providerContextSha256: 'a'.repeat(64),
  schema: {
    schemaVersion: 'local-data-schema.v1',
    columns: [
      { ordinal: 0, name: 'same', sourceType: 'int8', localType: 'BIGINT', nullable: false },
      { ordinal: 1, name: 'same', sourceType: 'text', localType: 'VARCHAR', nullable: true },
      { ordinal: 2, name: 'flag', sourceType: 'bool', localType: 'BOOLEAN', nullable: false },
    ],
  },
});
let sandbox: string;
let config: Extract<LocalDataConfiguration, { kind: 'configured' }>;
let runtime: DuckDbLocalDataRuntime;
let store: DuckDbGenerationStore;
let controller: globalThis.AbortController;
let rejectCommit: boolean;
let checkpoints: number;

beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-generation-')));
  const root = path.join(sandbox, 'local');
  const authoring = path.join(sandbox, 'authoring');
  await mkdir(root, { mode: 0o700 });
  await mkdir(authoring, { mode: 0o700 });
  config = {
    kind: 'configured',
    root,
    workspaceFilesRoot: authoring,
    memoryLimitBytes: 134217728,
    threads: 1,
    maxTempBytes: 268435456,
    maxOpenWorkspaces: 3,
    maxConcurrentSessions: 5,
  };
  runtime = new DuckDbLocalDataRuntime(config);
  controller = new globalThis.AbortController();
  rejectCommit = false;
  checkpoints = 0;
  store = makeStore();
  if (process.platform !== 'win32') await store.initialize();
});
afterEach(async () => {
  try {
    await runtime.close();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});
function makeStore(selectedScope = scope, budget = limits): DuckDbGenerationStore {
  return new DuckDbGenerationStore(
    runtime,
    selectedScope,
    {
      signal: controller.signal,
      checkpoint: async () => {
        checkpoints++;
      },
      beforePromotion: async () => {
        checkpoints++;
        if (rejectCommit) throw new Error('secret authorization diagnostic');
      },
    },
    budget
  );
}
async function stage(
  dataset = createLocalDatasetIdV1(),
  expected: string | null = null,
  data = rows,
  selectedRequest = request
): Promise<{
  readonly schemaVersion: 'local-data-generation.v1';
  readonly localDatasetId: ReturnType<typeof import('@dvt/contracts').createLocalDatasetIdV1>;
  readonly captureId: ReturnType<typeof import('@dvt/contracts').createLocalDataCaptureIdV1>;
  readonly generationId: ReturnType<typeof import('@dvt/contracts').createLocalDataGenerationIdV1>;
  readonly request: {
    schemaVersion: 'local-data-acquisition-request.v1';
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1';
      connectionRef: { schemaVersion: 'connection-ref.v1'; connectionId: string; provider: string };
      sourceObjectId: string;
    };
    policy: { kind: 'full' } | { kind: 'sample'; method: 'first'; requestedRows: string };
    schema: {
      schemaVersion: 'local-data-schema.v1';
      columns: {
        ordinal: number;
        name: string;
        sourceType: string;
        localType: string;
        nullable: boolean;
      }[];
    };
    providerContextSha256: LocalDataAcquisitionRequestV1['providerContextSha256'];
  };
  readonly requestFingerprint: string;
  readonly schemaSha256: string;
  readonly coverage: { readonly kind: 'full'; readonly eofObserved: true };
  readonly completionReason: 'source-exhausted';
  readonly rowCount: string;
  readonly sourceObservation: { readonly observedAt: '2026-10-17T10:00:00.000Z' };
  readonly createdAt: '2026-10-17T10:01:00.000Z';
}> {
  const captureId = createLocalDataCaptureIdV1();
  const receipt = await store.begin({
    localDatasetId: dataset,
    captureId,
    expectedHeadGenerationId: expected,
    request: selectedRequest,
  });
  if (data.length) await store.append(captureId, data);
  const manifest = {
    schemaVersion: 'local-data-generation.v1',
    localDatasetId: dataset,
    captureId,
    generationId: receipt.generationId,
    request: selectedRequest,
    requestFingerprint: createLocalDataRequestFingerprintV1(selectedRequest),
    schemaSha256: createLocalDataSchemaDigestV1(selectedRequest.schema),
    coverage: { kind: 'full', eofObserved: true },
    completionReason: 'source-exhausted',
    rowCount: String(data.length),
    sourceObservation: { observedAt: '2026-10-17T10:00:00.000Z' },
    createdAt: '2026-10-17T10:01:00.000Z',
  } as const;
  return manifest;
}
async function catalog(sql: string): Promise<import('@duckdb/node-api').DuckDBValue[][]> {
  return runtime.withSession(scope, async (c) => (await c.runAndReadAll(sql)).getRows());
}

if (process.platform === 'win32') {
  it('rejects the unsupported platform instead of claiming persistence proof', async () => {
    await assert.rejects(store.initialize(), /unsupported_platform/);
  });
} else
  describe('native transactional generations', () => {
    it('commits staging without publication, then publishes one exact typed generation', async () => {
      const m = await stage();
      assert.equal(await store.readHead(m.localDatasetId), null);
      assert.equal(await store.readGeneration(m.localDatasetId, m.generationId), null);
      assert.equal((await store.promote(m)).disposition, 'published');
      assert.deepEqual(await store.readHead(m.localDatasetId), m);
      const physical = await catalog('SELECT relation_key FROM dvt_meta.generation_manifests');
      const key = String(physical[0]![0]);
      assert.match(key, /^r_[0-9a-f]{32}$/);
      assert.deepEqual(
        await catalog(`SELECT * FROM dvt_store.${key} ORDER BY c0, c1 NULLS FIRST, c2`),
        [rows[1], rows[2], rows[0]]
      );
      assert.ok(!JSON.stringify(await store.readHead(m.localDatasetId)).includes(key));
      assert.ok(checkpoints > 4);
    });
    it('publishes empty complete input without pretending it is absent', async () => {
      const m = await stage(undefined, null, []);
      await store.promote(m);
      assert.equal((await store.readHead(m.localDatasetId))?.rowCount, '0');
    });
    it('keeps prior generations and rejects stale compare-and-swap without partial metadata', async () => {
      const first = await stage();
      await store.promote(first);
      const a = await stage(first.localDatasetId, first.generationId);
      const b = await stage(first.localDatasetId, first.generationId);
      await store.promote(a);
      await assert.rejects(store.promote(b), /HEAD_CONFLICT/);
      assert.equal((await store.readHead(first.localDatasetId))?.generationId, a.generationId);
      assert.deepEqual(await store.readGeneration(first.localDatasetId, first.generationId), first);
      assert.equal(await store.readGeneration(first.localDatasetId, b.generationId), null);
      assert.deepEqual(await catalog('SELECT count(*) FROM dvt_meta.generation_manifests'), [[2n]]);
    });
    it('recovers a committed capture idempotently even after another refresh wins', async () => {
      const a = await stage();
      await store.promote(a);
      const b = await stage(a.localDatasetId, a.generationId);
      await store.promote(b);
      assert.equal((await store.promote(a)).disposition, 'already_published');
      assert.deepEqual(await store.readCapture(a.localDatasetId, a.captureId), a);
      assert.equal((await store.readHead(a.localDatasetId))?.generationId, b.generationId);
      await assert.rejects(store.append(a.captureId, rows), /CAPTURE_SEALED/);
      await assert.rejects(
        store.promote({ ...a, createdAt: '2026-10-17T10:02:00.000Z' }),
        /MANIFEST_MISMATCH/
      );
    });
    it('rolls back manifest, sealing and head if final authorization rejects', async () => {
      const a = await stage();
      await store.promote(a);
      const b = await stage(a.localDatasetId, a.generationId);
      let checks = 0;
      const guarded = new DuckDbGenerationStore(
        runtime,
        scope,
        {
          signal: controller.signal,
          checkpoint: async () => undefined,
          beforePromotion: async () => {
            if (++checks === 2) throw new Error('secret');
          },
        },
        limits
      );
      await assert.rejects(guarded.promote(b), /ACCESS_REJECTED/);
      assert.deepEqual(await store.readHead(a.localDatasetId), a);
      assert.equal(await store.readCapture(a.localDatasetId, b.captureId), null);
      assert.deepEqual(
        await catalog(
          `SELECT sealed FROM dvt_meta.staged_captures WHERE capture_id='${b.captureId}'`
        ),
        [[false]]
      );
      await store.promote(b);
    });
    it('fails early on aborted access without modifying the head', async () => {
      const a = await stage();
      controller.abort();
      await assert.rejects(store.promote(a), /ACCESS_REJECTED/);
      controller = new globalThis.AbortController();
      store = makeStore();
      assert.equal(await store.readHead(a.localDatasetId), null);
    });
    it('validates request and actual row count before publication', async () => {
      const a = await stage();
      await assert.rejects(store.promote({ ...a, rowCount: '4' }), /ROW_COUNT_MISMATCH/);
      await assert.rejects(
        store.promote({ ...a, schemaSha256: 'b'.repeat(64) }),
        /INVALID_MANIFEST/
      );
      assert.equal(await store.readHead(a.localDatasetId), null);
      await store.promote(a);
    });
    it('detects physical schema drift rather than trusting the submitted digest', async () => {
      const a = await stage();
      const key = String(
        (await catalog('SELECT relation_key FROM dvt_meta.staged_captures'))[0]![0]
      );
      await catalog(`ALTER TABLE dvt_store.${key} ADD COLUMN injected INTEGER`);
      await assert.rejects(store.promote(a), /SCHEMA_MISMATCH/);
      assert.equal(await store.readHead(a.localDatasetId), null);
    });
    it('rejects unsupported declarations and unsafe cells without partial batches', async () => {
      const a = await stage(undefined, null, []);
      for (const bad of [[[1, 'x', true]], [[1n, 'x', null]], [[1n, '\ud800', false]]]) {
        await assert.rejects(store.append(a.captureId, bad), /INVALID_BATCH/);
      }
      const unsafe = globalThis.structuredClone(request);
      unsafe.schema.columns[0]!.localType = 'BIGINT); DROP SCHEMA dvt_meta CASCADE;--';
      await assert.rejects(stage(undefined, null, [], unsafe), /UNSUPPORTED_SCHEMA/);
      await store.promote(a);
    });
    it('enforces per-capture budgets without claiming aggregate workspace quotas', async () => {
      store = makeStore(scope, { maxRows: 2, maxLogicalBytes: 256 });
      const a = await stage(undefined, null, []);
      await assert.rejects(store.append(a.captureId, rows), /CAPTURE_BUDGET/);
      assert.deepEqual(await catalog('SELECT row_count FROM dvt_meta.staged_captures'), [[0n]]);
    });
    it('keeps FIRST N a sample and refuses rows beyond its target', async () => {
      const sampled = {
        ...request,
        policy: { kind: 'sample' as const, method: 'first' as const, requestedRows: '3' },
      };
      const m = await stage(undefined, null, rows, sampled);
      await assert.rejects(store.append(m.captureId, [[4n, 'extra', false]]), /CAPTURE_BUDGET/);
      await assert.rejects(store.promote(m), /INVALID_MANIFEST/);
      const sample = {
        ...m,
        coverage: { kind: 'sample' as const },
        completionReason: 'sample-target-reached' as const,
      };
      await store.promote(sample);
      assert.equal((await store.readHead(m.localDatasetId))?.coverage.kind, 'sample');
    });
    it('rejects reusing a capture ID and preserves its previous staging', async () => {
      const m = await stage();
      await assert.rejects(
        store.begin({
          localDatasetId: m.localDatasetId,
          captureId: m.captureId,
          request,
          expectedHeadGenerationId: null,
        }),
        /CAPTURE_EXISTS/
      );
      await store.promote(m);
    });
    it('copies request and scope before the caller can mutate them', async () => {
      const inputScope = { ...scope };
      const bound = makeStore(inputScope);
      inputScope.tenantId = 'other';
      const req = globalThis.structuredClone(request);
      const dataset = createLocalDatasetIdV1();
      const capture = createLocalDataCaptureIdV1();
      const pending = bound.begin({
        localDatasetId: dataset,
        captureId: capture,
        request: req,
        expectedHeadGenerationId: null,
      });
      req.schema.columns[0]!.localType = 'DOUBLE';
      await pending;
      await bound.append(capture, rows);
      assert.deepEqual(await catalog('SELECT row_count FROM dvt_meta.staged_captures'), [[3n]]);
    });
    it('resolves exact IDs only and isolates two workspace stores', async () => {
      const a = await stage();
      await store.promote(a);
      assert.equal(await store.readGeneration(createLocalDatasetIdV1(), a.generationId), null);
      const other = makeStore({ ...scope, projectId: 'other' });
      await other.initialize();
      assert.equal(await other.readHead(a.localDatasetId), null);
      assert.equal(await other.readCapture(a.localDatasetId, a.captureId), null);
    });
    it('rejects metadata version or scope drift instead of repairing it', async () => {
      await catalog("UPDATE dvt_meta.storage_info SET scope_json='wrong'");
      await assert.rejects(store.initialize(), /STORAGE_IDENTITY_MISMATCH/);
    });
    it('rejects malformed READY metadata rather than returning null', async () => {
      const a = await stage();
      await store.promote(a);
      await catalog("UPDATE dvt_meta.generation_manifests SET manifest_json='{}'");
      await assert.rejects(store.readHead(a.localDatasetId), /CORRUPT_METADATA/);
    });
    it('reopens persisted staging and resumes publication with the same identities', async () => {
      const a = await stage();
      await runtime.close();
      runtime = new DuckDbLocalDataRuntime(config);
      store = makeStore();
      await store.initialize();
      await store.promote(a);
      assert.deepEqual(await store.readGeneration(a.localDatasetId, a.generationId), a);
    });
    it('does not mix snapshots when a second connection promotes a refresh', async () => {
      const a = await stage();
      await store.promote(a);
      const b = await stage(a.localDatasetId, a.generationId);
      await runtime.withSession(scope, async (reader) => {
        await reader.run('BEGIN TRANSACTION');
        const before = (
          await reader.runAndReadAll('SELECT generation_id FROM dvt_meta.dataset_heads')
        ).getRows();
        await store.promote(b);
        const during = (
          await reader.runAndReadAll('SELECT generation_id FROM dvt_meta.dataset_heads')
        ).getRows();
        assert.deepEqual(before, [[a.generationId]]);
        assert.deepEqual(during, before);
        await reader.run('COMMIT');
      });
      assert.equal((await store.readHead(a.localDatasetId))?.generationId, b.generationId);
    });
    it('admits only one concurrent initial publication of the same dataset', async () => {
      const a = await stage();
      const b = await stage(a.localDatasetId);
      const outcomes = await Promise.allSettled([store.promote(a), store.promote(b)]);
      assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1);
      assert.deepEqual(await catalog('SELECT count(*) FROM dvt_meta.generation_manifests'), [[1n]]);
    });
  });
