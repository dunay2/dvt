/** @ownedConcern Reject partial or lost generation catalogs without rebuilding over retained data. */
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

const scope = { tenantId: 'catalog-tenant', projectId: 'catalog-project', environmentId: 'test' };
const request: LocalDataAcquisitionRequestV1 = LocalDataAcquisitionRequestV1Schema.parse({
  schemaVersion: 'local-data-acquisition-request.v1',
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: { schemaVersion: 'connection-ref.v1', connectionId: 'pg', provider: 'postgres' },
    sourceObjectId: 'table:public:fixture',
  },
  policy: { kind: 'full' },
  providerContextSha256: 'a'.repeat(64),
  schema: {
    schemaVersion: 'local-data-schema.v1',
    columns: [{ ordinal: 0, name: 'id', sourceType: 'int8', localType: 'BIGINT', nullable: false }],
  },
});

let sandbox: string;
let runtime: DuckDbLocalDataRuntime;
let store: DuckDbGenerationStore;

beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-catalog-boundary-')));
  const root = path.join(sandbox, 'local');
  const authoring = path.join(sandbox, 'authoring');
  await mkdir(root, { mode: 0o700 });
  await mkdir(authoring, { mode: 0o700 });
  runtime = new DuckDbLocalDataRuntime({
    kind: 'configured',
    root,
    workspaceFilesRoot: authoring,
    memoryLimitBytes: 134217728,
    threads: 1,
    maxTempBytes: 268435456,
    maxOpenWorkspaces: 1,
    maxConcurrentSessions: 2,
  });
  store = new DuckDbGenerationStore(
    runtime,
    scope,
    {
      signal: new globalThis.AbortController().signal,
      checkpoint: async () => undefined,
      beforePromotion: async () => undefined,
    },
    { maxRows: 10, maxLogicalBytes: 1024 }
  );
  if (process.platform !== 'win32') await store.initialize();
});
afterEach(async () => {
  try {
    await runtime.close();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

async function sql(statement: string): Promise<import('@duckdb/node-api').DuckDBValue[][]> {
  return runtime.withSession(scope, async (c) => (await c.runAndReadAll(statement)).getRows());
}
async function inventory(): Promise<import('@duckdb/node-api').DuckDBValue[][]> {
  return sql(
    "SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema IN ('dvt_meta','dvt_store') ORDER BY table_schema, table_name"
  );
}
async function publishFixture(): Promise<{
  localDatasetId: ReturnType<typeof import('@dvt/contracts').createLocalDatasetIdV1>;
  key: string;
}> {
  const localDatasetId = createLocalDatasetIdV1();
  const captureId = createLocalDataCaptureIdV1();
  const receipt = await store.begin({
    localDatasetId,
    captureId,
    request,
    expectedHeadGenerationId: null,
  });
  await store.append(captureId, [[9007199254740993n]]);
  await store.promote({
    schemaVersion: 'local-data-generation.v1',
    localDatasetId,
    captureId,
    generationId: receipt.generationId,
    request,
    requestFingerprint: createLocalDataRequestFingerprintV1(request),
    schemaSha256: createLocalDataSchemaDigestV1(request.schema),
    coverage: { kind: 'full', eofObserved: true },
    completionReason: 'source-exhausted',
    rowCount: '1',
    sourceObservation: { observedAt: '2026-10-17T10:00:00.000Z' },
    createdAt: '2026-10-17T10:01:00.000Z',
  });
  const key = String((await sql('SELECT relation_key FROM dvt_meta.generation_manifests'))[0]![0]);
  assert.match(key, /^r_[0-9a-f]{32}$/u);
  return { localDatasetId, key };
}

if (process.platform === 'win32') {
  it('rejects the unsupported native platform', async () => {
    await assert.rejects(store.initialize(), /unsupported_platform/u);
  });
} else
  describe('native generation catalog boundary', () => {
    it('permits repeated initialization of the exact complete catalog', async () => {
      const before = await inventory();
      await store.initialize();
      assert.deepEqual(await inventory(), before);
      assert.equal(await store.readHead(createLocalDatasetIdV1()), null);
    });

    for (const destruction of [
      'DROP SCHEMA dvt_meta CASCADE',
      'DROP TABLE dvt_meta.dataset_heads; DROP TABLE dvt_meta.generation_manifests; DROP TABLE dvt_meta.staged_captures; DROP TABLE dvt_meta.storage_info',
    ]) {
      it(`does not reconstruct lost metadata over persisted generation data: ${destruction}`, async () => {
        const fixture = await publishFixture();
        await sql(destruction);
        const damaged = await inventory();
        await assert.rejects(store.initialize(), /CORRUPT_METADATA/u);
        assert.deepEqual(await inventory(), damaged);
        await assert.rejects(store.readHead(fixture.localDatasetId), /CORRUPT_METADATA/u);
        assert.deepEqual(await sql(`SELECT c0 FROM dvt_store.${fixture.key}`), [
          [9007199254740993n],
        ]);
      });
    }

    for (const schema of ['dvt_meta', 'dvt_store']) {
      it(`rejects a pre-existing empty reserved schema ${schema}`, async () => {
        await sql(
          `DROP SCHEMA dvt_meta CASCADE; DROP SCHEMA dvt_store CASCADE; CREATE SCHEMA ${schema}`
        );
        await assert.rejects(store.initialize(), /CORRUPT_METADATA/u);
        assert.deepEqual(await inventory(), []);
        assert.deepEqual(
          await sql(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('dvt_meta','dvt_store') ORDER BY schema_name"
          ),
          [[schema]]
        );
      });
    }

    const damageCases = [
      ['missing capture table', 'DROP TABLE dvt_meta.staged_captures'],
      ['unexpected metadata table', 'CREATE TABLE dvt_meta.unexpected (id BIGINT)'],
      ['missing data schema', 'DROP SCHEMA dvt_store'],
      [
        'head replaced by view',
        'CREATE SCHEMA fixture_backup; CREATE TABLE fixture_backup.heads AS SELECT * FROM dvt_meta.dataset_heads; DROP TABLE dvt_meta.dataset_heads; CREATE VIEW dvt_meta.dataset_heads AS SELECT * FROM fixture_backup.heads',
      ],
    ] as const;
    for (const [name, damage] of damageCases) {
      it(`refuses null for an absent ID with ${name}, and never repairs the catalog`, async () => {
        await sql(damage);
        const damaged = await inventory();
        await assert.rejects(store.readHead(createLocalDatasetIdV1()), /CORRUPT_METADATA/u);
        await assert.rejects(store.initialize(), /CORRUPT_METADATA/u);
        assert.deepEqual(await inventory(), damaged);
      });
    }
  });
