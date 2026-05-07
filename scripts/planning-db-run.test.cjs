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
  resolveComposeCommand,
  resetComposeCommandCache,
} = require('./planning-db-run.cjs');

const scriptPath = path.join(__dirname, 'planning-db-run.cjs');

test('planning DB defaults to a shared machine-local Windows data directory', () => {
  assert.equal(defaultDataDir, 'C:\\dvt\\planning-db\\postgres-data');
  assert.equal(
    defaultPgUrl,
    'postgresql://dvt_planning:dvt_planning_local@localhost:55432/dvt_planning'
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
