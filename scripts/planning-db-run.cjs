const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const repoRoot = path.resolve(__dirname, '..');
const composeFile = path.join(repoRoot, 'infra', 'planning-db', 'docker-compose.yml');
const projectName = 'dvt-planning-db';
const defaultDataDir = 'C:\\dvt\\planning-db\\postgres-data';
const defaultPgUrl = 'postgresql://dvt_planning:dvt_planning_local@localhost:55432/dvt_planning';
const containerName = 'dvt-planning-db-postgres';
const resetConfirmFlag = '--confirm-destroy-shared-planning-db';

let composeCommandCache = null;

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    stdio: 'inherit',
    env: buildPgEnv(),
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function runQuiet(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    stdio: 'ignore',
    env: buildPgEnv(),
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    ...options,
  });

  return !result.error && result.status === 0;
}

function buildPgEnv() {
  return {
    ...process.env,
    DATABASE_URL: defaultPgUrl,
    DVT_PLANNING_DB_URL: defaultPgUrl,
    DVT_PLANNING_DB_DATA_DIR: process.env.DVT_PLANNING_DB_DATA_DIR || defaultDataDir,
  };
}

function ensureDataDir() {
  fs.mkdirSync(process.env.DVT_PLANNING_DB_DATA_DIR || defaultDataDir, { recursive: true });
}

function timestampForFile(value = new Date()) {
  return new Date(value).toISOString().replace(/[-:.]/g, '');
}

function assertSafeDataDir(dataDir) {
  const resolved = path.resolve(dataDir);
  const parsed = path.parse(resolved);
  if (resolved === parsed.root || path.basename(resolved) !== 'postgres-data') {
    throw new Error(
      `Refusing to reset unsafe planning DB data directory "${resolved}". Expected a postgres-data directory.`
    );
  }

  return resolved;
}

function planResetDataDir(options = {}) {
  if (options.confirmDestroySharedPlanningDb !== true) {
    throw new Error(`planning:db:reset requires ${resetConfirmFlag}.`);
  }

  const dataDir = assertSafeDataDir(
    options.dataDir || process.env.DVT_PLANNING_DB_DATA_DIR || defaultDataDir
  );
  const backupDir = path.join(path.dirname(dataDir), 'backups');
  return {
    dataDir,
    backupDir,
    backupPath: path.join(
      backupDir,
      `planning-local-operations-${timestampForFile(options.now)}.json`
    ),
  };
}

function buildComposeArgs(actionArgs, prefixArgs = ['compose']) {
  return [...prefixArgs, '-p', projectName, '-f', composeFile, ...actionArgs];
}

function resolveComposeCommand() {
  if (composeCommandCache) {
    return composeCommandCache;
  }

  const dockerComposeV2 = childProcess.spawnSync('docker', ['compose', 'version'], {
    stdio: 'ignore',
  });
  if (!dockerComposeV2.error && dockerComposeV2.status === 0) {
    composeCommandCache = {
      command: 'docker',
      prefixArgs: ['compose'],
      shell: false,
    };
    return composeCommandCache;
  }

  const dockerComposeV1 = childProcess.spawnSync('docker-compose', ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  if (!dockerComposeV1.error && dockerComposeV1.status === 0) {
    composeCommandCache = {
      command: 'docker-compose',
      prefixArgs: [],
      shell: process.platform === 'win32',
    };
    return composeCommandCache;
  }

  throw new Error('Neither "docker compose" nor "docker-compose" is available.');
}

function resetComposeCommandCache() {
  composeCommandCache = null;
}

function runCompose(actionArgs) {
  ensureDataDir();
  const { command, prefixArgs, shell } = resolveComposeCommand();
  run(command, buildComposeArgs(actionArgs, prefixArgs), { shell });
}

function runComposeQuiet(actionArgs) {
  ensureDataDir();
  const { command, prefixArgs, shell } = resolveComposeCommand();
  return runQuiet(command, buildComposeArgs(actionArgs, prefixArgs), { shell });
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForPlanningDbReady(options = {}) {
  const attempts = options.attempts ?? 20;
  const intervalMs = options.intervalMs ?? 500;
  const readyArgs = [
    'exec',
    '-T',
    'postgres',
    'pg_isready',
    '-U',
    'dvt_planning',
    '-d',
    'dvt_planning',
  ];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (runComposeQuiet(readyArgs)) {
      return;
    }
    sleep(intervalMs);
  }

  throw new Error('Planning DB did not become ready before shared reset backup.');
}

async function readLocalOperationBackup(options = {}) {
  const client = options.client || new Client({ connectionString: defaultPgUrl });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const tableResult = await client.query(
      `select
         to_regclass('planning_query_store.planning_task_local_state') as local_state,
         to_regclass('planning_query_store.planning_local_operations') as local_operations`
    );
    const tables = tableResult.rows[0] || {};
    if (!tables.local_state && !tables.local_operations) {
      return {
        localTaskState: [],
        localOperations: [],
      };
    }

    const localTaskState = tables.local_state
      ? await client.query(
          'select * from planning_query_store.planning_task_local_state order by lane_id, task_id'
        )
      : { rows: [] };
    const localOperations = tables.local_operations
      ? await client.query(
          'select * from planning_query_store.planning_local_operations order by created_at, operation_id'
        )
      : { rows: [] };

    return {
      localTaskState: localTaskState.rows,
      localOperations: localOperations.rows,
    };
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function writeLocalOperationBackup(plan, backup, options = {}) {
  const hasRows = backup.localTaskState.length > 0 || backup.localOperations.length > 0;
  if (!hasRows) {
    return null;
  }

  const generatedAt = new Date(options.now || new Date()).toISOString();
  fs.mkdirSync(plan.backupDir, { recursive: true });
  fs.writeFileSync(
    plan.backupPath,
    JSON.stringify(
      {
        generatedAt,
        localTaskState: backup.localTaskState,
        localOperations: backup.localOperations,
      },
      null,
      2
    )
  );

  return plan.backupPath;
}

async function resetPlanningDb(options = {}) {
  const plan = planResetDataDir(options);
  const runComposeFn = options.runCompose || runCompose;
  const waitForReadyFn = options.waitForPlanningDbReady || waitForPlanningDbReady;
  const readBackupFn = options.readLocalOperationBackup || readLocalOperationBackup;
  const writeBackupFn = options.writeLocalOperationBackup || writeLocalOperationBackup;
  const rmSyncFn = options.rmSync || fs.rmSync;
  const mkdirSyncFn = options.mkdirSync || fs.mkdirSync;
  const logger = options.logger || console;
  runComposeFn(['up', '-d']);
  waitForReadyFn();

  let backup;
  try {
    backup = await readBackupFn();
  } catch (error) {
    throw new Error(
      `Unable to read planning DB local-operation backup before reset: ${
        error.message || error.code || error.name
      }`,
      { cause: error }
    );
  }
  const backupPath = writeBackupFn(plan, backup, options);

  if (backupPath) {
    logger.log(`[planning:db:reset] local operation backup written to ${backupPath}`);
  } else {
    logger.log('[planning:db:reset] no local operation rows found for backup');
  }

  runComposeFn(['down']);
  rmSyncFn(plan.dataDir, { recursive: true, force: true });
  mkdirSyncFn(plan.dataDir, { recursive: true });
  runComposeFn(['up', '-d']);
  waitForReadyFn();
  logger.log(`[planning:db:reset] reset shared planning DB data directory ${plan.dataDir}`);
}

function printEnv() {
  console.log(`DVT_PLANNING_DB_URL=${defaultPgUrl}`);
  console.log(`DATABASE_URL=${defaultPgUrl}`);
  console.log(`DVT_PLANNING_DB_DATA_DIR=${process.env.DVT_PLANNING_DB_DATA_DIR || defaultDataDir}`);
}

async function main() {
  const [action = 'up', ...rest] = process.argv.slice(2);

  if (action === 'up') {
    runCompose(['up', '-d', ...rest]);
    return;
  }

  if (action === 'down') {
    runCompose(['down', ...rest]);
    return;
  }

  if (action === 'logs') {
    runCompose(['logs', '-f', ...rest]);
    return;
  }

  if (action === 'ps') {
    runCompose(['ps', ...rest]);
    return;
  }

  if (action === 'env') {
    ensureDataDir();
    printEnv();
    return;
  }

  if (action === 'health') {
    runCompose([
      'exec',
      '-T',
      'postgres',
      'pg_isready',
      '-U',
      'dvt_planning',
      '-d',
      'dvt_planning',
    ]);
    return;
  }

  if (action === 'reset') {
    await resetPlanningDb({
      confirmDestroySharedPlanningDb: rest.includes(resetConfirmFlag),
    });
    return;
  }

  throw new Error(
    `Unknown planning DB action "${action}". Expected up, down, logs, ps, env, health, or reset.`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  composeFile,
  containerName,
  defaultDataDir,
  defaultPgUrl,
  projectName,
  buildPgEnv,
  buildComposeArgs,
  ensureDataDir,
  planResetDataDir,
  readLocalOperationBackup,
  resolveComposeCommand,
  resetPlanningDb,
  resetComposeCommandCache,
  runComposeQuiet,
  waitForPlanningDbReady,
  writeLocalOperationBackup,
};
