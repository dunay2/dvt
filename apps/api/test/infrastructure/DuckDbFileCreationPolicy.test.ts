/** Prove creation modes with the actual pinned addon in isolated process-start postures. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { it } from 'vitest';

const execute = promisify(execFile);
const apiRoot = fileURLToPath(new globalThis.URL('../../', import.meta.url));
const preload = fileURLToPath(
  new globalThis.URL('../../../../scripts/local-data-private-creation.cjs', import.meta.url)
);
// Isolate the inherited mask from the test worker; preserve the real child --require posture.
const launchWithMask = `
  process.umask(Number.parseInt(process.argv[1], 8));
  const child = require('node:child_process').spawnSync(process.execPath, process.argv.slice(2), {
    stdio: 'inherit', timeout: 9000, killSignal: 'SIGKILL'
  });
  if (child.error) throw child.error;
  if (child.signal || child.status === null) throw new Error('Creation probe terminated');
  process.exitCode = child.status;
`;
// Only fixture bytes and fixed SQL enter this child; it does not acquire a source or bypass DVT.
const probe = `
  import assert from 'node:assert/strict';
  import { lstat, mkdtemp, rm } from 'node:fs/promises';
  import { tmpdir } from 'node:os';
  import path from 'node:path';
  const { DuckDBInstance } = await import('@duckdb/node-api');
  const root = await mkdtemp(path.join(tmpdir(), 'dvt-native-creation-'));
  const database = path.join(root, 'proof.duckdb');
  const options = {
    enable_external_access: 'false', autoinstall_known_extensions: 'false',
    autoload_known_extensions: 'false', allow_unsigned_extensions: 'false',
    allow_community_extensions: 'false', allow_persistent_secrets: 'false',
    threads: '1', memory_limit: '64MB'
  };
  let instance;
  let connection;
  try {
    instance = await DuckDBInstance.create(database, options);
    connection = await instance.connect();
    await connection.run('CREATE TABLE proof (value INTEGER)');
    await connection.run('INSERT INTO proof VALUES (42)');
    const dbMode = (await lstat(database)).mode & 0o7777;
    // A missing WAL must fail, not be treated as evidence of private WAL creation.
    const walMode = (await lstat(database + '.wal')).mode & 0o7777;
    const version = (await connection.runAndReadAll('SELECT version()')).getRows()[0][0];
    connection.closeSync(); connection = undefined;
    instance.closeSync(); instance = undefined;
    instance = await DuckDBInstance.create(database, options);
    connection = await instance.connect();
    assert.deepEqual((await connection.runAndReadAll('SELECT value FROM proof')).getRows(), [[42]]);
    assert.equal((await lstat(database)).mode & 0o7777, dbMode);
    process.stdout.write(JSON.stringify({ version, dbMode, walMode, reopened: true }));
  } finally {
    try { connection?.closeSync(); } finally {
      try { instance?.closeSync(); } finally { await rm(root, { recursive: true, force: true }); }
    }
  }
`;

if (process.platform === 'win32') {
  it('does not claim a POSIX creation mask verifies Windows ACLs', () => {
    assert.equal(process.platform, 'win32');
    // Existing native runtime tests continue to require enabled LOCAL to reject on this host.
  });
} else {
  for (const [initialMask, usePreload, expectedMode] of [
    ['0022', false, 0o644],
    ['0077', false, 0o600],
    ['0022', true, 0o600],
  ] as const) {
    it(`measures native DB/WAL: mask ${initialMask}, explicit preload ${usePreload}`, async () => {
      const nodeArgs = [
        ...(usePreload ? ['--require', preload] : []),
        '--input-type=module',
        '-e',
        probe,
      ];
      const { stdout } = await execute(
        process.execPath,
        ['--input-type=commonjs', '-e', launchWithMask, initialMask, ...nodeArgs],
        { cwd: apiRoot, timeout: 10000, maxBuffer: 1048576 }
      );
      const observed: unknown = JSON.parse(stdout.trim());
      assert.ok(observed !== null && typeof observed === 'object');
      const result = observed as Record<string, unknown>;
      assert.equal(result.dbMode, expectedMode);
      assert.equal(result.walMode, expectedMode);
      assert.equal(result.reopened, true);
      assert.equal(typeof result.version, 'string');
      // This is non-sensitive native evidence: modes/version only; no file paths or row values.
      process.stdout.write(
        `DVT_NATIVE_CREATION_PROOF ${JSON.stringify({ initialMask, usePreload, ...result })}\n`
      );
    }, 15000);
  }
}
