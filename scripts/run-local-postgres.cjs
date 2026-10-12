'use strict';

const childProcess = require('node:child_process');
const path = require('node:path');
const { Client } = require('pg');

const composeFile = path.resolve(
  __dirname,
  '..',
  'infra',
  'docker',
  'postgres',
  'docker-compose.yml'
);
const containerName = 'dvt-postgres';
const defaultPgUrl = 'postgresql://dvt:dvt@localhost:5432/dvt';
const defaultWarehousePgUrl = 'postgresql://dvt_demo:dvt_demo_local@localhost:5432/dvt_demo';
const baselineSchemas = Object.freeze(['core', 'eventstore', 'public']);
let composeCommandCache;

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function resolveComposeCommand() {
  if (composeCommandCache) return composeCommandCache;

  const v2 = childProcess.spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  if (!v2.error && v2.status === 0) {
    composeCommandCache = { command: 'docker', prefixArgs: ['compose'], shell: false };
    return composeCommandCache;
  }

  const v1 = childProcess.spawnSync('docker-compose', ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  if (!v1.error && v1.status === 0) {
    composeCommandCache = {
      command: 'docker-compose',
      prefixArgs: [],
      shell: process.platform === 'win32',
    };
    return composeCommandCache;
  }

  throw new Error('Neither docker compose nor docker-compose is available.');
}

function resetComposeCommandCache() {
  composeCommandCache = undefined;
}

function runCompose(args) {
  const { command, prefixArgs, shell } = resolveComposeCommand();
  run(command, [...prefixArgs, '-f', composeFile, ...args], { shell });
}

function composeDown() {
  runCompose(['down', '-v']);
}

function composeUp() {
  runCompose(['up', '-d']);
}

function inspectHealth() {
  const result = childProcess.spawnSync(
    'docker',
    [
      'inspect',
      containerName,
      '--format',
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',
    ],
    { encoding: 'utf8' }
  );
  return result.error || result.status !== 0 ? undefined : result.stdout.trim();
}

function waitForHealthy(timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = inspectHealth();
    if (state === 'healthy' || state === 'running') return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
  }
  throw new Error(`Timed out waiting for ${containerName} to become healthy`);
}

async function verifySeededBaseline() {
  const client = new Client({ connectionString: defaultPgUrl });
  await client.connect();
  try {
    const result = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name <> 'information_schema'
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `);
    const schemas = result.rows.map((row) => row.schema_name);
    const missing = baselineSchemas.filter((schema) => !schemas.includes(schema));
    const unexpected = schemas.filter((schema) => !baselineSchemas.includes(schema));
    if (missing.length || unexpected.length) {
      throw new Error(
        `Local PostgreSQL baseline mismatch: missing=${missing}; unexpected=${unexpected}`
      );
    }
  } finally {
    await client.end();
  }
}

async function reset() {
  composeDown();
  composeUp();
  waitForHealthy();
  await verifySeededBaseline();
  await ensureLocalWarehouseDatabase();
}

async function ensureLocalWarehouseDatabase() {
  const admin = new Client({ connectionString: defaultPgUrl });
  await admin.connect();
  try {
    const role = await admin.query("SELECT rolcanlogin FROM pg_roles WHERE rolname = 'dvt_demo'");
    if (role.rowCount === 0) {
      await admin.query("CREATE ROLE dvt_demo LOGIN PASSWORD 'dvt_demo_local'");
    } else if (role.rows[0].rolcanlogin !== true) {
      throw new Error('Local warehouse role dvt_demo exists but cannot log in');
    }

    const database = await admin.query(
      "SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = 'dvt_demo'"
    );
    if (database.rowCount === 0) {
      await admin.query('CREATE DATABASE dvt_demo OWNER dvt_demo');
    } else if (database.rows[0].owner !== 'dvt_demo') {
      throw new Error('Local warehouse database dvt_demo has an unexpected owner');
    }
  } finally {
    await admin.end();
  }

  const warehouse = new Client({ connectionString: defaultWarehousePgUrl });
  await warehouse.connect();
  try {
    const identity = await warehouse.query(
      'SELECT current_database() AS database, current_user AS role'
    );
    if (identity.rows[0]?.database !== 'dvt_demo' || identity.rows[0]?.role !== 'dvt_demo') {
      throw new Error('Local warehouse connection resolved to an unexpected database or role');
    }
  } finally {
    await warehouse.end();
  }
}

async function main() {
  const [action = 'up'] = process.argv.slice(2);
  if (action === 'down') return composeDown();
  if (action === 'reset') return reset();
  if (action === 'stop') return run('docker', ['stop', containerName]);
  if (action === 'start') {
    run('docker', ['start', containerName]);
    waitForHealthy();
    return ensureLocalWarehouseDatabase();
  }
  if (action === 'up') {
    composeUp();
    waitForHealthy();
    return ensureLocalWarehouseDatabase();
  }
  throw new Error(`Unknown action: ${action}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

module.exports = {
  composeDown,
  defaultPgUrl,
  defaultWarehousePgUrl,
  ensureLocalWarehouseDatabase,
  main,
  resetComposeCommandCache,
  resolveComposeCommand,
};
