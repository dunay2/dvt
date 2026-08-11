const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  defaultDataDir,
  defaultPgUrl,
  buildPgEnv,
  buildComposeArgs,
  ensureDataDir,
  isPlanningDbActive,
  planResetDataDir,
  resetPlanningDb,
  resolveDefaultDataDir,
  resolveComposeCommand,
  runPlanningDbUp,
  runPlanningDbHealth,
  resetComposeCommandCache,
  waitForPlanningDbReady,
} = require('./planning-db-run.cjs');

const scriptPath = path.join(__dirname, 'planning-db-run.cjs');

test('planning DB resolves the shared machine-local Windows data directory', () => {
  assert.equal(resolveDefaultDataDir('win32'), 'C:\\dvt\\planning-db\\postgres-data');
  assert.equal(
    defaultPgUrl,
    'postgresql://dvt_planning:dvt_planning_local@localhost:55432/dvt_planning'
  );
});

test('planning DB default data directory follows the active platform', () => {
  assert.equal(defaultDataDir, resolveDefaultDataDir());
});

test('planning DB defaults to a Docker-compatible workspace directory on Linux', () => {
  const linuxRepoRoot = '/home/runner/work/dvt/dvt';

  assert.equal(
    resolveDefaultDataDir('linux', linuxRepoRoot),
    path.posix.join(linuxRepoRoot, 'planning-db', 'postgres-data')
  );
});

test('planning DB environment exports the canonical shared DSN', (t) => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalPlanningUrl = process.env.DVT_PLANNING_DB_URL;
  const originalPlanningDataDir = process.env.DVT_PLANNING_DB_DATA_DIR;

  t.after(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalPlanningUrl === undefined) {
      delete process.env.DVT_PLANNING_DB_URL;
    } else {
      process.env.DVT_PLANNING_DB_URL = originalPlanningUrl;
    }

    if (originalPlanningDataDir === undefined) {
      delete process.env.DVT_PLANNING_DB_DATA_DIR;
    } else {
      process.env.DVT_PLANNING_DB_DATA_DIR = originalPlanningDataDir;
    }
  });

  process.env.DATABASE_URL = 'postgresql://other/database';
  process.env.DVT_PLANNING_DB_URL = 'postgresql://other/planning';
  delete process.env.DVT_PLANNING_DB_DATA_DIR;

  const env = buildPgEnv();
  assert.equal(env.DATABASE_URL, defaultPgUrl);
  assert.equal(env.DVT_PLANNING_DB_URL, defaultPgUrl);
  assert.equal(env.DVT_PLANNING_DB_DATA_DIR, defaultDataDir);
});

test('planning DB environment preserves an operator data directory override', (t) => {
  const originalPlanningDataDir = process.env.DVT_PLANNING_DB_DATA_DIR;
  const configuredDataDir = 'D:\\dvt-planning-db\\postgres-data';

  t.after(() => {
    if (originalPlanningDataDir === undefined) {
      delete process.env.DVT_PLANNING_DB_DATA_DIR;
    } else {
      process.env.DVT_PLANNING_DB_DATA_DIR = originalPlanningDataDir;
    }
  });

  process.env.DVT_PLANNING_DB_DATA_DIR = configuredDataDir;

  assert.equal(buildPgEnv().DVT_PLANNING_DB_DATA_DIR, configuredDataDir);
});

test('compose args use a fixed project name so every worktree targets one DB', () => {
  assert.deepEqual(buildComposeArgs(['up', '-d']).slice(0, 4), [
    'compose',
    '-p',
    'dvt-planning-db',
    '-f',
  ]);
  assert.deepEqual(buildComposeArgs(['up', '-d']).slice(-2), ['up', '-d']);
});

test('ensureDataDir creates the shared data directory recursively', (t) => {
  const mkdirCalls = [];
  const originalPlanningDataDir = process.env.DVT_PLANNING_DB_DATA_DIR;

  t.mock.method(fs, 'mkdirSync', (target, options) => {
    mkdirCalls.push({ target, options });
  });

  t.after(() => {
    if (originalPlanningDataDir === undefined) {
      delete process.env.DVT_PLANNING_DB_DATA_DIR;
    } else {
      process.env.DVT_PLANNING_DB_DATA_DIR = originalPlanningDataDir;
    }
  });

  delete process.env.DVT_PLANNING_DB_DATA_DIR;
  ensureDataDir();
  assert.deepEqual(mkdirCalls, [
    {
      target: defaultDataDir,
      options: { recursive: true },
    },
  ]);
});

test('ensureDataDir creates the configured planning DB data directory recursively', (t) => {
  const mkdirCalls = [];
  const originalPlanningDataDir = process.env.DVT_PLANNING_DB_DATA_DIR;
  const configuredDataDir = 'D:\\dvt-planning-db\\postgres-data';

  t.mock.method(fs, 'mkdirSync', (target, options) => {
    mkdirCalls.push({ target, options });
  });

  t.after(() => {
    if (originalPlanningDataDir === undefined) {
      delete process.env.DVT_PLANNING_DB_DATA_DIR;
    } else {
      process.env.DVT_PLANNING_DB_DATA_DIR = originalPlanningDataDir;
    }
  });

  process.env.DVT_PLANNING_DB_DATA_DIR = configuredDataDir;

  ensureDataDir();
  assert.deepEqual(mkdirCalls, [
    {
      target: configuredDataDir,
      options: { recursive: true },
    },
  ]);
});

test('planResetDataDir requires explicit shared DB destruction confirmation', () => {
  assert.throws(
    () => planResetDataDir({ confirmDestroySharedPlanningDb: false }),
    /requires --confirm-destroy-shared-planning-db/
  );
});

test('planResetDataDir resolves only the shared data directory', () => {
  const plan = planResetDataDir({
    confirmDestroySharedPlanningDb: true,
  });

  assert.equal(path.normalize(plan.dataDir), path.normalize(defaultDataDir));
});

test('resetPlanningDb destroys old state before starting the empty database', async () => {
  const calls = [];
  const plan = planResetDataDir({
    confirmDestroySharedPlanningDb: true,
  });

  await resetPlanningDb({
    confirmDestroySharedPlanningDb: true,
    runCompose: (args) => calls.push(['compose', args]),
    waitForPlanningDbReady: () => calls.push(['wait-ready']),
    logger: { log: () => {} },
    rmSync: (target, options) => calls.push(['rm', target, options]),
    mkdirSync: (target, options) => calls.push(['mkdir', target, options]),
  });

  assert.deepEqual(calls, [
    ['compose', ['down']],
    ['rm', plan.dataDir, { recursive: true, force: true }],
    ['mkdir', plan.dataDir, { recursive: true }],
    ['compose', ['up', '-d']],
    ['wait-ready'],
  ]);
});

test('runPlanningDbUp retries transient compose startup failures', () => {
  const calls = [];
  const warnings = [];

  runPlanningDbUp([], {
    attempts: 3,
    intervalMs: 1,
    runCompose: (args) => {
      calls.push(['compose', args]);
      if (calls.length === 1) {
        throw new Error('docker registry context deadline exceeded');
      }
    },
    sleep: (intervalMs) => calls.push(['sleep', intervalMs]),
    logger: { warn: (message) => warnings.push(message) },
  });

  assert.deepEqual(calls, [
    ['compose', ['up', '-d']],
    ['sleep', 1],
    ['compose', ['up', '-d']],
  ]);
  assert.match(warnings[0], /attempt 1\/3/);
  assert.match(warnings[0], /context deadline exceeded/);
});

test('runPlanningDbUp fails after bounded compose startup attempts', () => {
  const calls = [];

  assert.throws(
    () =>
      runPlanningDbUp(['--pull', 'always'], {
        attempts: 2,
        intervalMs: 1,
        runCompose: (args) => {
          calls.push(args);
          throw new Error('docker compose up failed with exit code 1');
        },
        sleep: () => {},
        logger: { warn: () => {} },
      }),
    /Planning DB compose up failed after 2 attempt\(s\): docker compose up failed/
  );

  assert.deepEqual(calls, [
    ['up', '-d', '--pull', 'always'],
    ['up', '-d', '--pull', 'always'],
  ]);
});

test('waitForPlanningDbReady retries health probes until Postgres accepts connections', () => {
  const calls = [];
  const outcomes = [false, false, true];

  waitForPlanningDbReady({
    attempts: 3,
    intervalMs: 1,
    runComposeQuiet: (args) => {
      calls.push(['health', args]);
      return outcomes.shift();
    },
    sleep: (intervalMs) => calls.push(['sleep', intervalMs]),
  });

  assert.deepEqual(
    calls.map(([kind, value]) => [kind, kind === 'health' ? value.slice(0, 3) : value]),
    [
      ['health', ['exec', '-T', 'postgres']],
      ['sleep', 1],
      ['health', ['exec', '-T', 'postgres']],
      ['sleep', 1],
      ['health', ['exec', '-T', 'postgres']],
    ]
  );
});

test('runPlanningDbHealth wait mode uses the bounded readiness rail', () => {
  const calls = [];

  runPlanningDbHealth(['--wait'], {
    waitForPlanningDbReady: (options) => calls.push(options),
    attempts: 30,
    intervalMs: 2000,
  });

  assert.deepEqual(calls, [{ attempts: 30, intervalMs: 2000 }]);
});

test('runPlanningDbHealth active mode distinguishes pre-existing runtime ownership', () => {
  assert.doesNotThrow(() => runPlanningDbHealth(['--active'], { isPlanningDbActive: () => true }));
  assert.throws(
    () => runPlanningDbHealth(['--active'], { isPlanningDbActive: () => false }),
    (error) => {
      assert.match(error.message, /Planning DB is not active/);
      assert.equal(error.exitCode, 3);
      return true;
    }
  );
});

test('isPlanningDbActive treats only an absent container as inactive and fails closed otherwise', () => {
  assert.equal(
    isPlanningDbActive({
      spawnSync: () => ({
        status: 1,
        stdout: '',
        stderr: 'Error: No such object: dvt-planning-db-postgres',
      }),
    }),
    false
  );
  assert.throws(
    () =>
      isPlanningDbActive({
        spawnSync: () => ({ status: 1, stdout: '', stderr: 'Docker daemon unavailable' }),
      }),
    /Planning DB active probe failed/
  );
});

test('resolveComposeCommand prefers docker compose v2', (t) => {
  resetComposeCommandCache();
  t.after(() => {
    resetComposeCommandCache();
  });

  t.mock.method(childProcess, 'spawnSync', (command, args) => {
    assert.equal(command, 'docker');
    assert.deepEqual(args, ['compose', 'version']);
    return { status: 0 };
  });

  assert.deepEqual(resolveComposeCommand(), {
    command: 'docker',
    prefixArgs: ['compose'],
    shell: false,
  });
});

test('unknown planning DB action fails before touching Docker', () => {
  const result = childProcess.spawnSync(process.execPath, [scriptPath, 'not-a-real-action'], {
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown planning DB action "not-a-real-action"/);
});
