/** Requires the real pinned addon; a filesystem fixture is not a native runtime proof. */
import assert from 'node:assert/strict';
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, it } from 'vitest';

import { prepareDuckDbWorkspacePaths } from '../../src/infrastructure/duckdb/duckDbLocalDataPaths.js';
import { DuckDbLocalDataRuntime } from '../../src/infrastructure/duckdb/DuckDbLocalDataRuntime.js';
import type { LocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
let sandbox: string;
let config: Extract<LocalDataConfiguration, { kind: 'configured' }>;
let runtime: DuckDbLocalDataRuntime;

beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-native-storage-')));
  const root = path.join(sandbox, 'local');
  const authoring = path.join(sandbox, 'authoring');
  await mkdir(root, { mode: 0o700 });
  await mkdir(authoring, { mode: 0o700 });
  config = {
    kind: 'configured', root, workspaceFilesRoot: authoring,
    memoryLimitBytes: 134217728, threads: 1, maxTempBytes: 268435456,
    maxOpenWorkspaces: 2, maxConcurrentSessions: 2,
  };
  runtime = new DuckDbLocalDataRuntime(config);
});

afterEach(async () => {
  try { await runtime.close(); }
  finally { await rm(sandbox, { recursive: true, force: true }); }
});

if (process.platform === 'win32') {
  it('rejects unsupported native Windows storage before opening a database', async () => {
    await assert.rejects(runtime.withSession(scope, async () => undefined), /unsupported_platform/);
  });
} else describe('real native storage boundaries', () => {
  async function initializedPaths() {
    await runtime.withSession(scope, async (connection) => { await connection.run('SELECT 1'); });
    const paths = await prepareDuckDbWorkspacePaths(config, scope);
    assert.ok(paths);
    return paths;
  }

  it('creates actual DB/WAL with private modes and preserves data across native reopen', async () => {
    const paths = await initializedPaths();
    await runtime.withSession(scope, async (connection) => {
      await connection.run('CREATE TABLE privacy_proof (id INTEGER)');
      await connection.run('INSERT INTO privacy_proof VALUES (7)');
      assert.equal((await lstat(paths.database)).mode & 0o7777, 0o600);
      assert.equal((await lstat(`${paths.database}.wal`)).mode & 0o7777, 0o600);
    });
    await runtime.close();
    runtime = new DuckDbLocalDataRuntime(config);
    const rows = await runtime.withSession(scope, async (connection) =>
      (await connection.runAndReadAll('SELECT id FROM privacy_proof')).getRows());
    assert.deepEqual(rows, [[7]]);
  });

  it('rejects unsafe existing DB before handing a connection to the callback', async () => {
    const paths = await initializedPaths();
    let called = false;
    await chmod(paths.database, 0o644);
    try {
      await assert.rejects(runtime.withSession(scope, async () => { called = true; }), /permissions_unsafe/);
      assert.equal(called, false);
      assert.equal((await lstat(paths.database)).mode & 0o7777, 0o644);
    } finally { await chmod(paths.database, 0o600); }
  });

  it('checks a newly created WAL before reporting successful callback completion', async () => {
    const paths = await initializedPaths();
    try {
      await assert.rejects(runtime.withSession(scope, async (connection) => {
        await connection.run('CREATE TABLE wal_proof (id INTEGER)');
        await connection.run('INSERT INTO wal_proof VALUES (1)');
        await chmod(`${paths.database}.wal`, 0o660);
        return 'must not be reported as success';
      }), /permissions_unsafe/);
      assert.equal((await lstat(`${paths.database}.wal`)).mode & 0o7777, 0o660);
    } finally { await chmod(`${paths.database}.wal`, 0o600); }
  });

  it('still checks storage after a failing callback, without claiming rollback of its effects', async () => {
    const paths = await initializedPaths();
    try {
      await assert.rejects(runtime.withSession(scope, async () => {
        await chmod(paths.database, 0o644);
        throw new Error(`Sensitive diagnostic ${sandbox}`);
      }), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /permissions_unsafe/);
        assert.ok(!error.message.includes(sandbox));
        return true;
      });
    } finally { await chmod(paths.database, 0o600); }
  });

  it('rejects replaced shared temp before callback without removing the old directory', async () => {
    const paths = await initializedPaths();
    await rename(paths.temporary, `${paths.temporary}-old`);
    await mkdir(paths.temporary, { mode: 0o700 });
    let called = false;
    try {
      await assert.rejects(runtime.withSession(scope, async () => { called = true; }), /unsafe_file/);
      assert.equal(called, false);
      assert.ok((await lstat(`${paths.temporary}-old`)).isDirectory());
    } finally {
      await rm(paths.temporary, { recursive: true });
      await rename(`${paths.temporary}-old`, paths.temporary);
    }
  });

  it('does not recreate a missing shared temp for an existing instance', async () => {
    const paths = await initializedPaths();
    await rename(paths.temporary, `${paths.temporary}-old`);
    try {
      await assert.rejects(runtime.withSession(scope, async () => undefined), /not_found/);
      await assert.rejects(lstat(paths.temporary), { code: 'ENOENT' });
    } finally { await rename(`${paths.temporary}-old`, paths.temporary); }
  });

  it('preserves a shared-dir sentinel when another native session completes', async () => {
    const paths = await initializedPaths();
    // Sentinel proves non-deletion, not that the engine actually spilled a query.
    const sentinel = path.join(paths.temporary, 'active-reader-sentinel');
    await writeFile(sentinel, 'retain', { mode: 0o600 });
    await runtime.withSession(scope, async (first) => {
      await first.run('SELECT 1');
      await runtime.withSession(scope, async (second) => { await second.run('SELECT 2'); });
      assert.equal(await readFile(sentinel, 'utf8'), 'retain');
    });
    assert.equal(await readFile(sentinel, 'utf8'), 'retain');
  });

  it('retains the existing native security profile instead of broadening filesystem access', async () => {
    await initializedPaths();
    const rows = await runtime.withSession(scope, async (connection) =>
      (await connection.runAndReadAll("SELECT current_setting('enable_external_access'), current_setting('lock_configuration'), current_setting('allow_persistent_secrets')")).getRows());
    assert.deepEqual(rows, [[false, true, false]]);
    const forbiddenFile = path.join(sandbox, 'forbidden.csv').replaceAll("'", "''");
    for (const sql of [
      'SET enable_external_access = true',
      `COPY (SELECT 1) TO '${forbiddenFile}'`,
      'INSTALL httpfs',
    ]) {
      await assert.rejects(runtime.withSession(scope, async (connection) => { await connection.run(sql); }), /session_failed/);
    }
  });
});
