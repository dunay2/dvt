/** Real POSIX filesystem proof; fixture bytes are not a DuckDB database/WAL. */
import assert from 'node:assert/strict';
import { chmod, link, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, it } from 'vitest';

import {
  LocalDataStorageBoundaryError,
  prepareDuckDbWorkspacePaths,
  readDuckDbWorkspaceIdentity,
  validateDuckDbWorkspaceIdentity,
} from '../../src/infrastructure/duckdb/duckDbLocalDataPaths.js';
import type { LocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

const scope = Object.freeze({ tenantId: 'tenant', projectId: 'project', environmentId: 'dev' });
let sandbox: string;
let config: Extract<LocalDataConfiguration, { kind: 'configured' }>;

beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-storage-boundary-')));
  const root = path.join(sandbox, 'local');
  const authoring = path.join(sandbox, 'authoring');
  await mkdir(root, { mode: 0o700 });
  await mkdir(authoring, { mode: 0o700 });
  config = {
    kind: 'configured', root, workspaceFilesRoot: authoring,
    memoryLimitBytes: 134217728, threads: 1, maxTempBytes: 268435456,
    maxOpenWorkspaces: 2, maxConcurrentSessions: 2,
  };
});

afterEach(async () => {
  await rm(sandbox, { recursive: true, force: true });
});

async function rejected(action: () => Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof LocalDataStorageBoundaryError);
    assert.equal(error.reason, reason);
    assert.ok(!error.message.includes(sandbox));
    assert.equal(error.cause, undefined);
    return true;
  });
}

if (process.platform === 'win32') {
  it('does not treat POSIX checks as Windows ACL protection', async () => {
    await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'unsupported_platform');
  });
} else describe('private file modes', () => {
  for (const suffix of ['', '.wal']) {
    for (const mode of [0o644, 0o660, 0o666, 0o700, 0o1600, 0o2600, 0o4600]) {
      it(`rejects ${suffix || 'database'} mode ${mode.toString(8)} without repairing it`, async () => {
        const paths = await prepareDuckDbWorkspacePaths(config, scope);
        assert.ok(paths);
        const filename = `${paths.database}${suffix}`;
        const bytes = Buffer.from([0, 255, 17, 88]);
        await writeFile(filename, bytes, { mode: 0o600 });
        await chmod(filename, mode);
        await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'permissions_unsafe');
        assert.equal((await lstat(filename)).mode & 0o7777, mode);
        assert.deepEqual(await readFile(filename), bytes);
      });
    }
    it(`accepts mode 0600 for ${suffix || 'database'} and preserves bytes`, async () => {
      const paths = await prepareDuckDbWorkspacePaths(config, scope);
      assert.ok(paths);
      const filename = `${paths.database}${suffix}`;
      await writeFile(filename, 'not an engine-format proof', { mode: 0o600 });
      await prepareDuckDbWorkspacePaths(config, scope);
      assert.equal(await readFile(filename, 'utf8'), 'not an engine-format proof');
      assert.equal((await lstat(filename)).mode & 0o7777, 0o600);
    });
  }
  for (const role of ['root', 'namespace', 'workspace', 'temporary'] as const) {
    for (const mode of [0o1700, 0o2700]) {
      it(`rejects special bits in ${role} mode ${mode.toString(8)} without chmod`, async () => {
        const paths = await prepareDuckDbWorkspacePaths(config, scope);
        assert.ok(paths);
        const directory = { root: config.root, namespace: path.dirname(paths.directory),
          workspace: paths.directory, temporary: paths.temporary }[role];
        await chmod(directory, mode);
        await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'permissions_unsafe');
        assert.equal((await lstat(directory)).mode & 0o7777, mode);
      });
    }
  }
  it('disabled mode creates no entries and does not evaluate scope', async () => {
    const unreadableScope = { ...scope, get tenantId(): never { throw new Error('unexpected access'); } };
    assert.equal(await prepareDuckDbWorkspacePaths({ kind: 'disabled' }, unreadableScope), null);
    assert.deepEqual(await readdir(config.root), []);
  });
});


if (process.platform !== 'win32') describe('verify-only workspace identity', () => {
  async function fixture() {
    const paths = await prepareDuckDbWorkspacePaths(config, scope);
    assert.ok(paths);
    await writeFile(paths.database, 'opaque fixture, not DuckDB data', { mode: 0o600 });
    const identity = await readDuckDbWorkspaceIdentity(config, scope);
    return { paths, identity };
  }

  it('pins existing identities, is deeply frozen and preserves files on repeated validation', async () => {
    const { paths, identity } = await fixture();
    assert.ok(Object.isFrozen(identity));
    for (const role of ['root', 'namespace', 'workspace', 'database', 'temporary'] as const) {
      assert.ok(Object.isFrozen(identity[role]));
    }
    await writeFile(path.join(paths.temporary, 'owned-by-active-reader'), 'keep', { mode: 0o600 });
    await Promise.all(Array.from({ length: 12 }, () => validateDuckDbWorkspaceIdentity(config, scope, identity)));
    assert.deepEqual(await readDuckDbWorkspaceIdentity(config, scope), identity);
    assert.equal(await readFile(path.join(paths.temporary, 'owned-by-active-reader'), 'utf8'), 'keep');
    assert.equal(await readFile(paths.database, 'utf8'), 'opaque fixture, not DuckDB data');
  });

  for (const role of ['root', 'namespace', 'workspace', 'database', 'temporary'] as const) {
    it(`rejects a missing ${role} without recreating it`, async () => {
      const { paths, identity } = await fixture();
      const target = { root: config.root, namespace: path.dirname(paths.directory),
        workspace: paths.directory, database: paths.database, temporary: paths.temporary }[role];
      await rm(target, { recursive: true });
      await rejected(() => validateDuckDbWorkspaceIdentity(config, scope, identity), 'not_found');
      await assert.rejects(lstat(target), { code: 'ENOENT' });
    });

    it(`rejects replacement of ${role}, even when its descendants retain their inodes`, async () => {
      const { paths, identity } = await fixture();
      const target = { root: config.root, namespace: path.dirname(paths.directory),
        workspace: paths.directory, database: paths.database, temporary: paths.temporary }[role];
      const backup = `${target}-old`;
      await rename(target, backup);
      if (role === 'database') {
        await writeFile(target, 'replacement', { mode: 0o600 });
      } else {
        await mkdir(target, { mode: 0o700 });
        for (const entry of await readdir(backup)) await rename(path.join(backup, entry), path.join(target, entry));
      }
      await rejected(() => validateDuckDbWorkspaceIdentity(config, scope, identity), 'unsafe_file');
      assert.ok(await lstat(backup));
    });

    it(`rejects a ${role} symlink without touching the target`, async () => {
      const { paths, identity } = await fixture();
      const target = { root: config.root, namespace: path.dirname(paths.directory),
        workspace: paths.directory, database: paths.database, temporary: paths.temporary }[role];
      const backup = `${target}-old`;
      await rename(target, backup);
      await symlink(backup, target);
      await rejected(() => validateDuckDbWorkspaceIdentity(config, scope, identity), 'symlink_unsupported');
      assert.ok((await lstat(target)).isSymbolicLink());
    });
  }

  it('allows WAL creation, removal and a later WAL inode without changing the database identity', async () => {
    const { paths, identity } = await fixture();
    const wal = `${paths.database}.wal`;
    await writeFile(wal, 'wal-one', { mode: 0o600 });
    await validateDuckDbWorkspaceIdentity(config, scope, identity);
    await rename(wal, `${wal}-old`);
    await validateDuckDbWorkspaceIdentity(config, scope, identity);
    await writeFile(wal, 'wal-two', { mode: 0o600 });
    await validateDuckDbWorkspaceIdentity(config, scope, identity);
    assert.equal(await readFile(wal, 'utf8'), 'wal-two');
    assert.equal(await readFile(`${wal}-old`, 'utf8'), 'wal-one');
  });

  for (const suffix of ['', '.wal']) {
    it(`rejects a later permission change to ${suffix || 'database'}`, async () => {
      const { paths, identity } = await fixture();
      if (suffix) await writeFile(`${paths.database}${suffix}`, 'wal', { mode: 0o600 });
      await chmod(`${paths.database}${suffix}`, 0o644);
      await rejected(() => validateDuckDbWorkspaceIdentity(config, scope, identity), 'permissions_unsafe');
      assert.equal((await lstat(`${paths.database}${suffix}`)).mode & 0o7777, 0o644);
    });
    it(`rejects ${suffix || 'database'} hardlinks without deleting either link`, async () => {
      const { paths, identity } = await fixture();
      const target = `${paths.database}${suffix}`;
      if (suffix) await writeFile(target, 'wal', { mode: 0o600 });
      const other = path.join(sandbox, 'external-link');
      await link(target, other);
      await rejected(() => validateDuckDbWorkspaceIdentity(config, scope, identity), 'unsafe_file');
      assert.equal((await lstat(target)).nlink, 2);
      assert.equal((await lstat(other)).nlink, 2);
    });
    it(`rejects a directory in place of ${suffix || 'database'}`, async () => {
      const { paths, identity } = await fixture();
      const target = `${paths.database}${suffix}`;
      await rm(target, { force: true });
      await mkdir(target, { mode: 0o700 });
      await rejected(() => validateDuckDbWorkspaceIdentity(config, scope, identity), 'unsafe_file');
    });
  }

  it('rejects a dangling WAL symlink, not treating it as an absent WAL', async () => {
    const { paths, identity } = await fixture();
    const outside = path.join(sandbox, 'absent');
    await symlink(outside, `${paths.database}.wal`);
    await rejected(() => validateDuckDbWorkspaceIdentity(config, scope, identity), 'symlink_unsupported');
    await assert.rejects(lstat(outside), { code: 'ENOENT' });
  });

  it('rejects another scope with a healthy existing database', async () => {
    const { identity } = await fixture();
    const other = { ...scope, environmentId: 'other' };
    const paths = await prepareDuckDbWorkspacePaths(config, other);
    assert.ok(paths);
    await writeFile(paths.database, 'other', { mode: 0o600 });
    await rejected(() => validateDuckDbWorkspaceIdentity(config, other, identity), 'unsafe_file');
  });

  it('never creates a workspace to validate an unknown scope', async () => {
    const { paths, identity } = await fixture();
    const before = await readdir(path.dirname(paths.directory));
    await rejected(() => validateDuckDbWorkspaceIdentity(config, { ...scope, projectId: 'missing' }, identity), 'not_found');
    assert.deepEqual(await readdir(path.dirname(paths.directory)), before);
  });

  it('rejects invalid scope before filesystem lookup with a sanitized error', async () => {
    await rejected(() => readDuckDbWorkspaceIdentity(config, { ...scope, tenantId: ' ' }), 'invalid_scope');
    assert.deepEqual(await readdir(config.root), []);
  });

  it('does not change process umask, modes or private directory content', async () => {
    const mask = process.umask();
    const { paths, identity } = await fixture();
    for (let i = 0; i < 3; i++) await validateDuckDbWorkspaceIdentity(config, scope, identity);
    assert.equal(process.umask(), mask);
    assert.deepEqual(await readdir(paths.directory), ['temp', 'workspace.duckdb']);
    assert.equal((await lstat(paths.temporary)).mode & 0o7777, 0o700);
  });
});
