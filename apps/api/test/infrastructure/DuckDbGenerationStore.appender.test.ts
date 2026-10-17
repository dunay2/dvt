/** @ownedConcern Prove bounded native chunk writes and rollback with the pinned addon, not a SQL mock. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DuckDBAppender, DuckDBConnection } from '@duckdb/node-api';
import {
  createLocalDatasetIdV1,
  createLocalDataCaptureIdV1,
  createLocalDataRequestFingerprintV1,
  createLocalDataSchemaDigestV1,
  type LocalDataAcquisitionRequestV1,
} from '@dvt/contracts';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';

import { DuckDbGenerationStore } from '../../src/infrastructure/duckdb/DuckDbGenerationStore.js';
import { DuckDbLocalDataRuntime } from '../../src/infrastructure/duckdb/DuckDbLocalDataRuntime.js';
import { createPostgresLocalDataBatchCodec } from '../../src/infrastructure/postgres/postgresLocalDataBatchCodec.js';
import type { LocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const codec = createPostgresLocalDataBatchCodec([
  { ordinal: 0, name: 'same', dataTypeID: 20, nullable: false },
  { ordinal: 1, name: 'same', dataTypeID: 25, nullable: true },
  { ordinal: 2, name: 'flag', dataTypeID: 16, nullable: false },
]);
const request: LocalDataAcquisitionRequestV1 = {
  schemaVersion: 'local-data-acquisition-request.v1',
  sourceRef: { schemaVersion: 'connected-source-ref.v1',
    connectionRef: { schemaVersion: 'connection-ref.v1', connectionId: 'pg', provider: 'postgres' },
    sourceObjectId: 'table:public:orders' },
  policy: { kind: 'full' }, providerContextSha256: 'a'.repeat(64), schema: codec.schema,
};
const limits = { maxRows: 4096, maxLogicalBytes: 4194304 };
let sandbox: string;
let config: Extract<LocalDataConfiguration, { kind: 'configured' }>;
let runtime: DuckDbLocalDataRuntime;
let store: DuckDbGenerationStore;
let controller: AbortController;
let checks: number;
let denyAt: number;
let abortAt: number;

function makeStore() {
  return new DuckDbGenerationStore(runtime, scope, {
    signal: controller.signal,
    checkpoint: async () => undefined,
    beforePromotion: async () => {
      checks++;
      if (checks === denyAt) throw new Error('secret-policy-detail');
      if (checks === abortAt) controller.abort();
    },
  }, limits);
}
beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-appender-')));
  const root = path.join(sandbox, 'local');
  const authoring = path.join(sandbox, 'authoring');
  await mkdir(root, { mode: 0o700 }); await mkdir(authoring, { mode: 0o700 });
  config = { kind: 'configured', root, workspaceFilesRoot: authoring,
    memoryLimitBytes: 134217728, threads: 1, maxTempBytes: 268435456,
    maxOpenWorkspaces: 1, maxConcurrentSessions: 4 };
  runtime = new DuckDbLocalDataRuntime(config);
  controller = new AbortController(); checks = 0; denyAt = 0; abortAt = 0;
  store = makeStore();
  if (process.platform !== 'win32') await store.initialize();
});
afterEach(async () => {
  vi.restoreAllMocks();
  try { await runtime.close(); } finally { await rm(sandbox, { recursive: true, force: true }); }
});
async function sql(text: string, values: (string | bigint | boolean | null)[] = []) {
  return runtime.withSession(scope, async c => (await c.runAndReadAll(text, values)).getRows());
}
async function begin(selectedRequest = request) {
  const localDatasetId = createLocalDatasetIdV1();
  const captureId = createLocalDataCaptureIdV1();
  const receipt = await store.begin({ localDatasetId, captureId, request: selectedRequest, expectedHeadGenerationId: null });
  const key = String((await sql('SELECT relation_key FROM dvt_meta.staged_captures WHERE capture_id=$1', [captureId]))[0]![0]);
  assert.match(key, /^r_[0-9a-f]{32}$/u);
  return { ...receipt, localDatasetId, key };
}
function manifest(stage: Awaited<ReturnType<typeof begin>>, rowCount: number, logicalBytes: number) {
  return {
    schemaVersion: 'local-data-generation.v1', localDatasetId: stage.localDatasetId,
    captureId: stage.captureId, generationId: stage.generationId, request,
    requestFingerprint: createLocalDataRequestFingerprintV1(request),
    schemaSha256: createLocalDataSchemaDigestV1(request.schema),
    coverage: { kind: 'full', eofObserved: true }, completionReason: 'source-exhausted',
    rowCount: String(rowCount), logicalByteCount: String(logicalBytes),
    sourceObservation: { observedAt: '2026-10-17T10:00:00.000Z' },
    createdAt: '2026-10-17T10:01:00.000Z',
  } as const;
}
async function assertEmpty(stage: Awaited<ReturnType<typeof begin>>) {
  assert.deepEqual(await sql(`SELECT count(*) FROM dvt_store.${stage.key}`), [[0n]]);
  assert.deepEqual(await sql('SELECT row_count, logical_bytes, sealed FROM dvt_meta.staged_captures WHERE capture_id=$1',
    [stage.captureId]), [[0n, 0n, false]]);
  assert.equal(await store.readHead(stage.localDatasetId), null);
}

if (process.platform === 'win32') {
  it('rejects unsupported native LOCAL platform instead of claiming chunk proof', async () => {
    await assert.rejects(store.initialize(), /unsupported_platform/u);
  });
} else describe('native bounded DataChunk append', () => {
  it('writes 1024 PostgreSQL text fixture rows through one actual chunk, without per-row SQL', async () => {
    const stage = await begin();
    const raw = Array.from({ length: 1024 }, (_, i) => [String(9007199254740993n + BigInt(i)),
      i % 5 === 0 ? null : `dato ñ 👋 ${i}`, i % 2 === 0 ? 't' : 'f']);
    const batch = codec.decode(raw);
    const statements = vi.spyOn(DuckDBConnection.prototype, 'run');
    const chunks = vi.spyOn(DuckDBAppender.prototype, 'appendDataChunk');
    const closes = vi.spyOn(DuckDBAppender.prototype, 'closeSync');
    await store.append(stage.captureId, batch.rows);
    assert.equal(chunks.mock.calls.length, 1);
    assert.equal(chunks.mock.calls[0]![0].rowCount, 1024);
    assert.equal(closes.mock.calls.length, 1);
    assert.equal(statements.mock.calls.filter(([text]) => /^INSERT\s+INTO\s+dvt_store\./iu.test(text)).length, 0);
    assert.equal(await store.readHead(stage.localDatasetId), null);
    assert.deepEqual(await sql(`SELECT * FROM dvt_store.${stage.key} ORDER BY c0`), batch.rows);
    const ready = manifest(stage, batch.rows.length, batch.logicalBytes);
    await store.promote(ready);
    await runtime.close(); runtime = new DuckDbLocalDataRuntime(config); store = makeStore();
    await store.initialize();
    assert.deepEqual(await store.readHead(stage.localDatasetId), ready);
    assert.deepEqual(await sql(`SELECT * FROM dvt_store.${stage.key} ORDER BY c0`), batch.rows);
  }, 15000);
  it('preserves signed bigint endpoints, duplicate rows, NULL and embedded Unicode exactly', async () => {
    const stage = await begin();
    const batch = codec.decode([['-9223372036854775808', '', 'f'], ['0', null, 't'],
      ['0', null, 't'], ['9223372036854775807', 'e\u0301 👩🏽‍💻', 'f']]);
    await store.append(stage.captureId, batch.rows);
    assert.deepEqual(await sql(`SELECT * FROM dvt_store.${stage.key} ORDER BY c0`), batch.rows);
    await store.promote(manifest(stage, 4, batch.logicalBytes));
  });
  it('does not return before the staged batch and counters commit', async () => {
    const stage = await begin(); const batch = codec.decode([['2', 'x', 't']]);
    for (let i = 1; i <= 3; i++) {
      await store.append(stage.captureId, batch.rows);
      assert.deepEqual(await sql(`SELECT count(*) FROM dvt_store.${stage.key}`), [[BigInt(i)]]);
      assert.deepEqual(await sql('SELECT row_count, logical_bytes FROM dvt_meta.staged_captures WHERE capture_id=$1',
        [stage.captureId]), [[BigInt(i), BigInt(i * batch.logicalBytes)]]);
    }
  });
  it('rolls back flushed native rows and counters when final authorization denies', async () => {
    const stage = await begin(); const chunks = vi.spyOn(DuckDBAppender.prototype, 'appendDataChunk');
    const closes = vi.spyOn(DuckDBAppender.prototype, 'closeSync');
    checks = 0; denyAt = 2;
    await assert.rejects(store.append(stage.captureId, [[1n, 'secret-data', true]]), /ACCESS_REJECTED/u);
    assert.equal(chunks.mock.calls.length, 1); assert.equal(closes.mock.calls.length, 1);
    denyAt = 0; await assertEmpty(stage);
    await store.append(stage.captureId, [[2n, 'retry', true]]);
    assert.deepEqual(await sql(`SELECT c0 FROM dvt_store.${stage.key}`), [[2n]]);
  });
  it('rolls back a completed native append if abort is observed at the pre-commit checkpoint', async () => {
    const stage = await begin(); checks = 0; abortAt = 2;
    await assert.rejects(store.append(stage.captureId, [[1n, null, false]]), /ACCESS_REJECTED/u);
    controller = new AbortController(); abortAt = 0; store = makeStore();
    await assertEmpty(stage);
  });
  it('closes the real appender and rolls back its whole batch on native CHECK failure', async () => {
    const stage = await begin();
    await sql(`DROP TABLE dvt_store.${stage.key}; CREATE TABLE dvt_store.${stage.key}
      (c0 BIGINT NOT NULL CHECK(c0 <> 13), c1 VARCHAR, c2 BOOLEAN NOT NULL)`);
    const closes = vi.spyOn(DuckDBAppender.prototype, 'closeSync');
    await assert.rejects(store.append(stage.captureId, [[1n, 'first', true], [13n, 'second', false]]), /TRANSACTION_FAILED/u);
    assert.equal(closes.mock.calls.length, 1);
    await assertEmpty(stage);
    await store.append(stage.captureId, [[2n, 'valid', true]]);
    assert.deepEqual(await sql(`SELECT c0 FROM dvt_store.${stage.key}`), [[2n]]);
  });
  for (const columns of [
    'c0 INTEGER NOT NULL, c1 VARCHAR, c2 BOOLEAN NOT NULL',
    'other BIGINT NOT NULL, c1 VARCHAR, c2 BOOLEAN NOT NULL',
    'c0 BIGINT, c1 VARCHAR, c2 BOOLEAN NOT NULL',
  ]) {
    it(`rejects physical drift before native coercion: ${columns}`, async () => {
      const stage = await begin();
      await sql(`DROP TABLE dvt_store.${stage.key}; CREATE TABLE dvt_store.${stage.key} (${columns})`);
      const appenders = vi.spyOn(DuckDBConnection.prototype, 'createAppender');
      await assert.rejects(store.append(stage.captureId, [[1n, 'x', true]]), /SCHEMA_MISMATCH/u);
      assert.equal(appenders.mock.calls.length, 0); await assertEmpty(stage);
    });
  }
  it('rejects invalid cells and oversized batches before constructing an appender', async () => {
    const stage = await begin(); const appenders = vi.spyOn(DuckDBConnection.prototype, 'createAppender');
    await assert.rejects(store.append(stage.captureId, [[1, 'bad int8', true]]), /INVALID_BATCH/u);
    await assert.rejects(store.append(stage.captureId, [[1n, 'x'.repeat(1048577), true]]), /INVALID_BATCH/u);
    await assert.rejects(store.append(stage.captureId, Array.from({ length: 1025 }, () => [1n, null, true])), /INVALID_INPUT/u);
    assert.equal(appenders.mock.calls.length, 0); await assertEmpty(stage);
  });
  it('never appends to a sealed generation', async () => {
    const stage = await begin(); const batch = codec.decode([['1', 'x', 't']]);
    await store.append(stage.captureId, batch.rows); await store.promote(manifest(stage, 1, batch.logicalBytes));
    const appenders = vi.spyOn(DuckDBConnection.prototype, 'createAppender');
    await assert.rejects(store.append(stage.captureId, batch.rows), /CAPTURE_SEALED/u);
    assert.equal(appenders.mock.calls.length, 0);
    assert.deepEqual(await sql(`SELECT count(*) FROM dvt_store.${stage.key}`), [[1n]]);
  });
  it('keeps a successful prior batch if a later batch exceeds FIRST N', async () => {
    const selectedRequest = { ...request, policy: { kind: 'sample' as const, method: 'first' as const, requestedRows: '1' } };
    const stage = await begin(selectedRequest); await store.append(stage.captureId, [[1n, 'first', true]]);
    const appenders = vi.spyOn(DuckDBConnection.prototype, 'createAppender');
    await assert.rejects(store.append(stage.captureId, [[2n, 'excess', false]]), /CAPTURE_BUDGET/u);
    assert.equal(appenders.mock.calls.length, 0);
    assert.deepEqual(await sql(`SELECT c0 FROM dvt_store.${stage.key}`), [[1n]]);
    assert.equal(await store.readHead(stage.localDatasetId), null);
  });
});
