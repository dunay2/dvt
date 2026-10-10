/** Filesystem preflight is not a DuckDB open or an authorization proof. */
import assert from 'node:assert/strict';
import { chmod, link, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, it } from 'vitest';

import {
  LocalDataStorageBoundaryError,
  prepareDuckDbWorkspacePaths,
  validateDuckDbLocalDataRoots,
} from '../../src/infrastructure/duckdb/duckDbLocalDataPaths.js';
import { readLocalDataConfiguration, type LocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

let sandbox: string;
let config: Extract<LocalDataConfiguration, { kind: 'configured' }>;
const scope = Object.freeze({ tenantId: 'tenant', projectId: 'project', environmentId: 'dev' });

async function rejected(action: () => Promise<unknown>, reason: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof LocalDataStorageBoundaryError);
    assert.equal(error.reason, reason);
    assert.ok(!error.message.includes(sandbox));
    return true;
  });
}

beforeEach(async () => {
  sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'dvt-local-paths-')));
  const root = path.join(sandbox, 'local');
  const authoring = path.join(sandbox, 'authoring');
  await mkdir(root, { mode: 0o700 });
  await mkdir(authoring, { mode: 0o700 });
  const parsed = readLocalDataConfiguration({
    DVT_LOCAL_DATA_ENABLED: 'true', DVT_LOCAL_DATA_ROOT: root,
    DVT_WORKSPACE_FILES_ROOT: authoring, DVT_DUCKDB_MEMORY_LIMIT_BYTES: '134217728',
    DVT_DUCKDB_THREADS: '1', DVT_DUCKDB_MAX_TEMP_BYTES: '268435456',
    DVT_LOCAL_DATA_MAX_OPEN_WORKSPACES: '2', DVT_LOCAL_DATA_MAX_CONCURRENT_SESSIONS: '2',
  });
  assert.ok(parsed.kind === 'configured');
  config = parsed;
});
afterEach(async () => { await rm(sandbox, { recursive: true, force: true }); });

it('disabled mode never resolves paths or evaluates the scope', async () => {
  const disabled = Object.freeze({ kind: 'disabled' as const, get root(): never { throw new Error('I/O forbidden'); } });
  const unreadableScope = { ...scope, get tenantId(): never { throw new Error('scope forbidden'); } };
  await validateDuckDbLocalDataRoots(disabled);
  assert.equal(await prepareDuckDbWorkspacePaths(disabled, unreadableScope), null);
  assert.deepEqual(await readdir(config.root), []);
});

if (process.platform === 'win32') {
  it('does not pretend POSIX permission checks validate Windows ACLs', async () => {
    await rejected(() => validateDuckDbLocalDataRoots(config), 'unsupported_platform');
  });
} else describe('POSIX storage preflight', () => {
  it('validates existing roots without creating data or authoring entries', async () => {
    await validateDuckDbLocalDataRoots(config);
    assert.deepEqual(await readdir(config.root), []);
    assert.deepEqual(await readdir(config.workspaceFilesRoot), []);
  });

  it('isolates scopes, reuses paths and creates only private directories', async () => {
    const a = await prepareDuckDbWorkspacePaths(config, scope);
    const b = await prepareDuckDbWorkspacePaths(config, { ...scope, tenantId: 'other' });
    assert.ok(a && b);
    assert.notEqual(a.directory, b.directory);
    assert.deepEqual(await prepareDuckDbWorkspacePaths(config, scope), a);
    assert.match(path.basename(a.directory), /^[a-f0-9]{64}$/);
    for (const directory of [path.dirname(a.directory), a.directory, a.temporary]) {
      assert.equal((await lstat(directory)).mode & 0o777, 0o700);
    }
    assert.deepEqual(await readdir(a.directory), ['temp']);
    assert.equal(a.database, path.join(a.directory, 'workspace.duckdb'));
    assert.ok(Object.isFrozen(a));
    assert.deepEqual(await readdir(config.workspaceFilesRoot), []);
  });

  it('concurrent preparation is idempotent and creates no database file', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => prepareDuckDbWorkspacePaths(config, scope)));
    for (const result of results) assert.deepEqual(result, results[0]);
    assert.ok(results[0]);
    assert.deepEqual(await readdir(results[0].directory), ['temp']);
  });

  it('rejects empty identity before creating scope directories', async () => {
    await rejected(() => prepareDuckDbWorkspacePaths(config, { ...scope, tenantId: ' ' }), 'invalid_scope');
    assert.deepEqual(await readdir(config.root), []);
  });

  it('opaque identities never become path segments', async () => {
    const result = await prepareDuckDbWorkspacePaths(config, { ...scope, projectId: '../../escape' });
    assert.ok(result);
    assert.match(path.relative(config.root, result.directory), /^scopes\/[a-f0-9]{64}$/);
    assert.deepEqual(await readdir(sandbox), ['authoring', 'local']);
  });

  for (const suffix of ['', '.wal']) it(`preserves existing ${suffix || 'database'} bytes`, async () => {
    const result = await prepareDuckDbWorkspacePaths(config, scope);
    assert.ok(result);
    const filename = `${result.database}${suffix}`;
    const bytes = Buffer.from([0, 255, 17, 88]); // Opaque bytes, not a claim of valid DuckDB format.
    await writeFile(filename, bytes, { mode: 0o600 });
    await prepareDuckDbWorkspacePaths(config, scope);
    assert.deepEqual(await readFile(filename), bytes);
  });

  for (const leaf of ['root', 'authoring', 'scopes', 'scope', 'temp', 'database', 'wal', 'dangling']) {
    it(`rejects a substituted ${leaf} symlink without writing outside`, async () => {
      const result = await prepareDuckDbWorkspacePaths(config, scope);
      assert.ok(result);
      const outside = path.join(sandbox, 'outside');
      await mkdir(outside, { mode: 0o700 });
      const names = { root: config.root, authoring: config.workspaceFilesRoot,
        scopes: path.dirname(result.directory), scope: result.directory, temp: result.temporary,
        database: result.database, wal: `${result.database}.wal`, dangling: result.database };
      const filename = names[leaf as keyof typeof names];
      await rm(filename, { recursive: true, force: true });
      await symlink(leaf === 'dangling' ? path.join(outside, 'absent') : outside, filename);
      await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'symlink_unsupported');
      assert.deepEqual(await readdir(outside), []);
    });
  }

  it('rejects a symlink in an intermediate root component', async () => {
    const alias = path.join(sandbox, 'alias');
    await symlink(sandbox, alias);
    await rejected(() => validateDuckDbLocalDataRoots({ ...config, root: path.join(alias, 'local') }), 'symlink_unsupported');
  });

  for (const suffix of ['', '.wal']) it(`rejects ${suffix || 'database'} hardlinks`, async () => {
    const result = await prepareDuckDbWorkspacePaths(config, scope);
    assert.ok(result);
    const outside = path.join(sandbox, 'outside-file');
    await writeFile(outside, 'unchanged', { mode: 0o600 });
    await link(outside, `${result.database}${suffix}`);
    await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'unsafe_file');
    assert.equal(await readFile(outside, 'utf8'), 'unchanged');
  });

  for (const suffix of ['', '.wal']) it(`rejects a directory at ${suffix || 'database'}`, async () => {
    const result = await prepareDuckDbWorkspacePaths(config, scope);
    assert.ok(result);
    await mkdir(`${result.database}${suffix}`);
    await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'unsafe_file');
  });

  for (const position of ['root', 'namespace', 'ancestor']) it(`rejects unsafe ${position} permissions without chmod repair`, async () => {
    const directory = position === 'ancestor' ? sandbox : position === 'root' ? config.root : path.join(config.root, 'scopes');
    if (position === 'namespace') await mkdir(directory, { mode: 0o700 });
    await chmod(directory, 0o777);
    await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'permissions_unsafe');
    assert.equal((await lstat(directory)).mode & 0o777, 0o777);
  });

  it('rejects missing roots rather than provisioning or replacing them', async () => {
    await rm(config.root, { recursive: true });
    await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'not_found');
    assert.deepEqual(await readdir(sandbox), ['authoring']);
  });

  it('rejects wrong-type roots and preserves their content', async () => {
    await rm(config.root, { recursive: true });
    await writeFile(config.root, 'retain');
    await rejected(() => prepareDuckDbWorkspacePaths(config, scope), 'not_directory');
    assert.equal(await readFile(config.root, 'utf8'), 'retain');
  });

  it('rejects overlapping physical roots even from an unchecked internal config', async () => {
    for (const authoring of [config.root, sandbox]) {
      await rejected(() => validateDuckDbLocalDataRoots({ ...config, workspaceFilesRoot: authoring }), 'unsafe_path');
    }
  });
});
