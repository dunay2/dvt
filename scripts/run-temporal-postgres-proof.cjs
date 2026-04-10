const { spawnSync } = require('node:child_process');
const path = require('node:path');

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
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
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

function inspectHealth() {
  const result = spawnSync(
    'docker',
    [
      'inspect',
      containerName,
      '--format',
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',
    ],
    { encoding: 'utf8' }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function composeDown() {
  spawnSync('docker', ['compose', '-f', composeFile, 'down', '-v'], { stdio: 'inherit' });
}

function composeUp() {
  run('docker', ['compose', '-f', composeFile, 'up', '-d']);
}

function waitForHealthy(timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const state = inspectHealth();

    if (state === 'healthy' || state === 'running') {
      return;
    }

    sleep(1000);
  }

  throw new Error(`Timed out waiting for ${containerName} to become healthy`);
}

function buildPgEnv() {
  const pgUrl = process.env.DVT_PG_URL ?? process.env.DATABASE_URL ?? defaultPgUrl;

  return {
    ...process.env,
    DVT_PG_INTEGRATION: '1',
    DVT_PG_URL: pgUrl,
    DATABASE_URL: pgUrl,
  };
}

function runPostgresProofTest() {
  run(
    pnpmCommand,
    ['--filter', '@dvt/adapter-temporal', 'run', 'test:integration:postgres:local'],
    { env: buildPgEnv() }
  );
}

function main() {
  const [action = 'test', ...flags] = process.argv.slice(2);
  const reset = flags.includes('--reset');
  const downAfter = flags.includes('--down-after');

  if (action === 'down') {
    composeDown();
    return;
  }

  if (action === 'reset') {
    composeDown();
    composeUp();
    waitForHealthy();
    return;
  }

  if (action === 'up') {
    if (reset) {
      composeDown();
    }

    composeUp();
    waitForHealthy();
    return;
  }

  if (action === 'test') {
    if (reset) {
      composeDown();
    }

    composeUp();
    waitForHealthy();
    runPostgresProofTest();

    if (downAfter) {
      composeDown();
    }

    return;
  }

  throw new Error(`Unknown action: ${action}`);
}

main();
