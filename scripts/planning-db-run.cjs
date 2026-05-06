const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const composeFile = path.join(repoRoot, 'infra', 'planning-db', 'docker-compose.yml');
const projectName = 'dvt-planning-db';
const defaultDataDir = 'C:\\dvt\\planning-db\\postgres-data';
const defaultPgUrl = 'postgresql://dvt_planning:dvt_planning_local@localhost:55432/dvt_planning';
const containerName = 'dvt-planning-db-postgres';

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

function buildPgEnv() {
  return {
    ...process.env,
    DATABASE_URL: defaultPgUrl,
    DVT_PLANNING_DB_URL: defaultPgUrl,
    DVT_PLANNING_DB_DATA_DIR: defaultDataDir,
  };
}

function ensureDataDir() {
  fs.mkdirSync(defaultDataDir, { recursive: true });
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

function printEnv() {
  console.log(`DVT_PLANNING_DB_URL=${defaultPgUrl}`);
  console.log(`DATABASE_URL=${defaultPgUrl}`);
  console.log(`DVT_PLANNING_DB_DATA_DIR=${defaultDataDir}`);
}

function main() {
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

  throw new Error(
    `Unknown planning DB action "${action}". Expected up, down, logs, ps, env, or health.`
  );
}

if (require.main === module) {
  main();
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
  resolveComposeCommand,
  resetComposeCommandCache,
};
