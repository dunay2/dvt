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
}

async function main() {
  const [action = 'up'] = process.argv.slice(2);
  if (action === 'down') return composeDown();
  if (action === 'reset') return reset();
  if (action === 'stop') return run('docker', ['stop', containerName]);
  if (action === 'start') {
    run('docker', ['start', containerName]);
    return waitForHealthy();
  }
  if (action === 'up') {
    composeUp();
    return waitForHealthy();
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
  main,
  resetComposeCommandCache,
  resolveComposeCommand,
};
