/** @ownedConcern Kill an isolated native writer at the publication boundary and inspect real WAL recovery. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { it } from 'vitest';

import { DuckDbGenerationStore } from '../../src/infrastructure/duckdb/DuckDbGenerationStore.js';
import { DuckDbLocalDataRuntime } from '../../src/infrastructure/duckdb/DuckDbLocalDataRuntime.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const preload = fileURLToPath(
  new globalThis.URL('../../../../scripts/local-data-private-creation.cjs', import.meta.url)
);
const runtimeUrl = new globalThis.URL(
  '../../dist/infrastructure/duckdb/DuckDbLocalDataRuntime.js',
  import.meta.url
).href;
const storeUrl = new globalThis.URL(
  '../../dist/infrastructure/duckdb/DuckDbGenerationStore.js',
  import.meta.url
).href;

type Marker = { dataset: string; first: string; second: string; capture: string };
async function killedWriter(program: string): Promise<Marker> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--require', preload, '--input-type=module', '-e', program],
      {
        cwd: fileURLToPath(new globalThis.URL('../../', import.meta.url)),
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    let output = '';
    let stderr = '';
    let marker: Marker | undefined;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Writer did not reach the publication boundary'));
    }, 12000);
    child.stderr.on('data', (data) => {
      stderr = (stderr + String(data)).slice(-4000);
    });
    child.stdout.on('data', (data) => {
      output += String(data);
      const lines = output.split('\n');
      lines.pop(); // Do not parse a partial pipe chunk.
      const line = lines.find((value) => value.startsWith('KILL_POINT '));
      if (!line || marker) return;
      try {
        marker = JSON.parse(line.slice(11)) as Marker;
        child.kill('SIGKILL');
      } catch (error) {
        child.kill('SIGKILL');
        reject(error);
      }
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (signal === 'SIGKILL' && marker) resolve(marker);
      else reject(new Error(`Native child failed before barrier: ${code}/${signal}: ${stderr}`));
    });
  });
}
for (const boundary of ['before-commit', 'after-commit'] as const) {
  it.skipIf(process.platform === 'win32')(
    `recovers a writer killed ${boundary} without a partial READY/head`,
    async () => {
      const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-generation-crash-')));
      const root = path.join(sandbox, 'local');
      const authoring = path.join(sandbox, 'authoring');
      await mkdir(root, { mode: 0o700 });
      await mkdir(authoring, { mode: 0o700 });
      const config = {
        kind: 'configured' as const,
        root,
        workspaceFilesRoot: authoring,
        memoryLimitBytes: 134217728,
        threads: 1,
        maxTempBytes: 268435456,
        maxOpenWorkspaces: 2,
        maxConcurrentSessions: 2,
      };
      let runtime: DuckDbLocalDataRuntime | undefined;
      try {
        const marker = await killedWriter(`
        import { DuckDbLocalDataRuntime } from ${JSON.stringify(runtimeUrl)};
        import { DuckDbGenerationStore } from ${JSON.stringify(storeUrl)};
        import { createLocalDatasetIdV1, createLocalDataCaptureIdV1,
          createLocalDataRequestFingerprintV1, createLocalDataSchemaDigestV1 } from '@dvt/contracts';
        const runtime = new DuckDbLocalDataRuntime(${JSON.stringify(config)});
        const controller = new AbortController(); let armed = false; let checks = 0; let marker;
        const hold = async () => {
          setInterval(() => {}, 1000);
          console.log('KILL_POINT ' + JSON.stringify(marker));
          await new Promise(() => {});
        };
        const store = new DuckDbGenerationStore(runtime, ${JSON.stringify(scope)}, {
          signal: controller.signal, checkpoint: async () => {},
          beforePromotion: async () => {
            if (armed && ++checks === 2 && ${JSON.stringify(boundary)} === 'before-commit') await hold();
          },
        }, { maxRows: 100, maxLogicalBytes: 4096 });
        await store.initialize();
        const request = { schemaVersion: 'local-data-acquisition-request.v1',
          sourceRef: { schemaVersion: 'connected-source-ref.v1', connectionRef: {
            schemaVersion: 'connection-ref.v1', connectionId: 'pg', provider: 'postgres' }, sourceObjectId: 'orders' },
          schema: { schemaVersion: 'local-data-schema.v1', columns: [
            { ordinal: 0, name: 'id', sourceType: 'int8', localType: 'BIGINT', nullable: false }] },
          policy: { kind: 'full' }, providerContextSha256: 'a'.repeat(64) };
        const dataset = createLocalDatasetIdV1();
        async function stage(expected, row) {
          const captureId = createLocalDataCaptureIdV1();
          const receipt = await store.begin({ localDatasetId: dataset, captureId, request, expectedHeadGenerationId: expected });
          await store.append(captureId, [[row]]);
          return { schemaVersion: 'local-data-generation.v1', localDatasetId: dataset, captureId,
            generationId: receipt.generationId, request, requestFingerprint: createLocalDataRequestFingerprintV1(request),
            schemaSha256: createLocalDataSchemaDigestV1(request.schema), coverage: { kind: 'full', eofObserved: true },
            completionReason: 'source-exhausted', rowCount: '1',
            sourceObservation: { observedAt: '2026-10-17T10:00:00.000Z' }, createdAt: '2026-10-17T10:01:00.000Z' };
        }
        const first = await stage(null, 1n); await store.promote(first);
        const second = await stage(first.generationId, 2n);
        marker = { dataset, first: first.generationId, second: second.generationId, capture: second.captureId };
        armed = true; await store.promote(second);
        await hold();
      `);
        runtime = new DuckDbLocalDataRuntime(config);
        const controller = new globalThis.AbortController();
        const store = new DuckDbGenerationStore(
          runtime,
          scope,
          {
            signal: controller.signal,
            checkpoint: async () => {},
            beforePromotion: async () => {},
          },
          { maxRows: 100, maxLogicalBytes: 4096 }
        );
        await store.initialize();
        const expected = boundary === 'before-commit' ? marker.first : marker.second;
        assert.equal((await store.readHead(marker.dataset))?.generationId, expected);
        assert.equal(
          (await store.readGeneration(marker.dataset, marker.first))?.generationId,
          marker.first
        );
        const second = await store.readCapture(marker.dataset, marker.capture);
        assert.equal(
          second?.generationId ?? null,
          boundary === 'before-commit' ? null : marker.second
        );
        const count = await runtime.withSession(scope, async (c) =>
          (await c.runAndReadAll('SELECT count(*) FROM dvt_meta.generation_manifests')).getRows()
        );
        assert.deepEqual(count, [[boundary === 'before-commit' ? 1n : 2n]]);
      } finally {
        try {
          await runtime?.close();
        } finally {
          await rm(sandbox, { recursive: true, force: true });
        }
      }
    },
    20000
  );
}
