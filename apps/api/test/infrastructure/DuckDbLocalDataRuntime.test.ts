/**
 * Owned concern: prove real native workspace ownership, privacy and session lifecycle.
 * @baseline #3389: infrastructure availability is not LOCAL execution readiness.
 * @decision Use the actual pinned driver and private temporary POSIX storage.
 * @consequence Windows proves rejection; supported POSIX hosts prove native behavior.
 * @version 1.0.0
 */
import assert from 'node:assert/strict';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, it } from 'vitest';

import { prepareDuckDbWorkspacePaths } from '../../src/infrastructure/duckdb/duckDbLocalDataPaths.js';
import {
  DuckDbLocalDataRuntime,
  LocalDataRuntimeError,
} from '../../src/infrastructure/duckdb/DuckDbLocalDataRuntime.js';
import type { LocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
let sandbox: string;
let config: Extract<LocalDataConfiguration, { kind: 'configured' }>;
let runtime: DuckDbLocalDataRuntime;

function deferred(): Readonly<{ promise: Promise<void>; resolve: () => void }> {
  let resolve = (): void => {
    throw new Error('Deferred initializer missing');
  };
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

async function rejectsReason(action: () => Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof LocalDataRuntimeError);
    assert.equal(error.reason, reason);
    assert.ok(!error.message.includes(sandbox));
    return true;
  });
}

beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-native-foundation-')));
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
    maxOpenWorkspaces: 2,
    maxConcurrentSessions: 2,
  };
  runtime = new DuckDbLocalDataRuntime(config);
});

afterEach(async () => {
  await runtime.close();
  await rm(sandbox, { recursive: true, force: true });
});

it('disabled mode performs no filesystem or scope work and closes idempotently', async () => {
  const disabled = new DuckDbLocalDataRuntime({ kind: 'disabled' });
  const unreadableScope = {
    ...scope,
    get tenantId(): never {
      throw new Error('Scope must not be read');
    },
  };
  await rejectsReason(
    () => disabled.withSession(unreadableScope, async () => undefined),
    'disabled'
  );
  await disabled.close();
  await disabled.close();
  assert.deepEqual(await readdir(config.root), []);
});

if (process.platform === 'win32') {
  it('enabled mode fails closed without pretending POSIX checks validate Windows ACLs', async () => {
    await assert.rejects(
      runtime.withSession(scope, async () => undefined),
      /unsupported_platform/
    );
    assert.deepEqual(await readdir(config.root), []);
  });
} else
  describe('actual pinned native POSIX lifecycle', () => {
    it('persists real data across close and reopen', async () => {
      await runtime.withSession(scope, async (connection) => {
        await connection.run('CREATE TABLE proof (value INTEGER)');
        await connection.run('INSERT INTO proof VALUES (42)');
      });
      await runtime.close();
      runtime = new DuckDbLocalDataRuntime(config);
      const rows = await runtime.withSession(scope, async (connection) =>
        (await connection.runAndReadAll('SELECT value FROM proof')).getRows()
      );
      assert.deepEqual(rows, [[42]]);
    });

    it('shares one instance across simultaneous same-scope sessions', async () => {
      runtime = new DuckDbLocalDataRuntime({ ...config, maxOpenWorkspaces: 1 });
      const firstReady = deferred();
      const secondReady = deferred();
      const first = runtime.withSession(scope, async (connection) => {
        await connection.run('CREATE TABLE shared_proof (value INTEGER)');
        firstReady.resolve();
        await secondReady.promise;
        return (await connection.runAndReadAll('SELECT value FROM shared_proof')).getRows();
      });
      const second = runtime.withSession(scope, async (connection) => {
        await firstReady.promise;
        await connection.run('INSERT INTO shared_proof VALUES (7)');
        secondReady.resolve();
      });
      await Promise.all([first, second]);
      assert.deepEqual(await first, [[7]]);
    });

    it('keeps scopes distinct and bounds open workspace admission', async () => {
      const other = { ...scope, projectId: 'other' };
      for (const [target, value] of [
        [scope, 1],
        [other, 2],
      ] as const) {
        await runtime.withSession(target, async (connection) => {
          await connection.run('CREATE TABLE scoped_proof (value INTEGER)');
          await connection.run(`INSERT INTO scoped_proof VALUES (${value})`);
        });
      }
      for (const [target, value] of [
        [scope, 1],
        [other, 2],
      ] as const) {
        const rows = await runtime.withSession(target, async (connection) =>
          (await connection.runAndReadAll('SELECT value FROM scoped_proof')).getRows()
        );
        assert.deepEqual(rows, [[value]]);
      }
      await rejectsReason(
        () => runtime.withSession({ ...scope, projectId: 'third' }, async () => undefined),
        'workspace_capacity'
      );
    });

    it('bounds pending sessions and drains them before closing the instance', async () => {
      runtime = new DuckDbLocalDataRuntime({ ...config, maxConcurrentSessions: 1 });
      const ready = deferred();
      const release = deferred();
      const first = runtime.withSession(scope, async (connection) => {
        ready.resolve();
        await release.promise;
        return (await connection.runAndReadAll('SELECT 9')).getRows();
      });
      await ready.promise;
      await rejectsReason(
        () => runtime.withSession(scope, async () => undefined),
        'session_capacity'
      );
      let closed = false;
      const closing = runtime.close().then(() => {
        closed = true;
      });
      await rejectsReason(() => runtime.withSession(scope, async () => undefined), 'closed');
      assert.equal(closed, false);
      release.resolve();
      assert.deepEqual(await first, [[9]]);
      await closing;
      await runtime.close();
    });

    it('disconnects temporary objects between sessions while retaining persistent data', async () => {
      await runtime.withSession(scope, async (connection) => {
        await connection.run('CREATE TEMP TABLE private_session AS SELECT 3 AS value');
        assert.deepEqual(
          (await connection.runAndReadAll('SELECT value FROM private_session')).getRows(),
          [[3]]
        );
      });
      await rejectsReason(
        () =>
          runtime.withSession(scope, async (connection) => {
            await connection.run('SELECT * FROM private_session');
          }),
        'session_failed'
      );
      assert.deepEqual(
        await runtime.withSession(scope, async (connection) =>
          (await connection.runAndReadAll('SELECT 4')).getRows()
        ),
        [[4]]
      );
    });

    it('preserves corrupt bytes, sanitizes failed open and releases workspace capacity for retry', async () => {
      runtime = new DuckDbLocalDataRuntime({ ...config, maxOpenWorkspaces: 1 });
      const paths = await prepareDuckDbWorkspacePaths(config, scope);
      assert.ok(paths);
      const corrupt = Buffer.from('not a database; must be retained');
      await writeFile(paths.database, corrupt, { mode: 0o600 });
      await rejectsReason(() => runtime.withSession(scope, async () => undefined), 'open_failed');
      assert.deepEqual(await readFile(paths.database), corrupt);
      const rows = await runtime.withSession(
        { ...scope, projectId: 'healthy' },
        async (connection) => (await connection.runAndReadAll('SELECT 5')).getRows()
      );
      assert.deepEqual(rows, [[5]]);
    });

    it('locks honest instance settings and rejects external access and extension acquisition', async () => {
      const settings = await runtime.withSession(scope, async (connection) =>
        (
          await connection.runAndReadAll(
            "SELECT current_setting('threads'), current_setting('enable_external_access'), current_setting('autoinstall_known_extensions'), current_setting('autoload_known_extensions'), current_setting('allow_persistent_secrets'), current_setting('lock_configuration')"
          )
        ).getRows()
      );
      assert.deepEqual(settings, [[1n, false, false, false, false, true]]);
      for (const sql of [
        "SET memory_limit = '1GB'",
        "SELECT * FROM read_csv('/etc/passwd')",
        'INSTALL httpfs',
      ]) {
        await rejectsReason(
          () =>
            runtime.withSession(scope, async (connection) => {
              await connection.run(sql);
            }),
          'session_failed'
        );
      }
      const paths = await prepareDuckDbWorkspacePaths(config, scope);
      assert.ok(paths);
      const spill = await runtime.withSession(scope, async (connection) =>
        (await connection.runAndReadAll("SELECT current_setting('temp_directory')")).getRows()
      );
      assert.deepEqual(spill, [[paths.temporary]]);
    });

    it('revalidates the filesystem for reused sessions and rejects invalid scopes', async () => {
      await runtime.withSession(scope, async (connection) => {
        await connection.run('SELECT 1');
      });
      await assert.rejects(
        runtime.withSession({ ...scope, tenantId: '' }, async () => undefined),
        /invalid_scope/
      );
      await chmod(config.root, 0o777);
      await assert.rejects(
        runtime.withSession(scope, async () => undefined),
        /permissions_unsafe/
      );
      await chmod(config.root, 0o700);
    });
  });
