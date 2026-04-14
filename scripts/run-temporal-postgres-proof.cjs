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
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const proofBaselineSchemas = Object.freeze(['core', 'eventstore', 'public']);
const transientProofSchemaPatterns = Object.freeze([/^it_runtime_/, /^dvt_transform_it_/]);
let composeCommandCache = null;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function run(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
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

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
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

  throw new Error(
    'Neither "docker compose" nor "docker-compose" is available for the Temporal Postgres proof wrapper.'
  );
}

function resetComposeCommandCache() {
  composeCommandCache = null;
}

function composeDown() {
  const { command, prefixArgs, shell } = resolveComposeCommand();
  run(command, [...prefixArgs, '-f', composeFile, 'down', '-v'], { shell });
}

function composeUp() {
  const { command, prefixArgs, shell } = resolveComposeCommand();
  run(command, [...prefixArgs, '-f', composeFile, 'up', '-d'], { shell });
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
  const pgUrl = getProofPgUrl();

  return {
    ...process.env,
    DVT_PG_INTEGRATION: '1',
    DVT_PG_URL: pgUrl,
    DATABASE_URL: pgUrl,
  };
}

function getProofPgUrl() {
  return defaultPgUrl;
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function isTransientProofSchema(schemaName) {
  return transientProofSchemaPatterns.some((pattern) => pattern.test(schemaName));
}

function listTransientProofSchemas(schemaNames) {
  return [...schemaNames].filter(isTransientProofSchema).sort();
}

async function withProofClient(action) {
  const client = new Client({ connectionString: getProofPgUrl() });
  await client.connect();
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

async function listUserSchemas(client) {
  const result = await client.query(
    `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name <> 'information_schema'
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `
  );
  return result.rows.map((row) => row.schema_name);
}

async function verifySeededBaseline() {
  await withProofClient(async (client) => {
    const schemas = await listUserSchemas(client);
    const missing = proofBaselineSchemas.filter((schema) => !schemas.includes(schema));
    const unexpected = schemas.filter((schema) => !proofBaselineSchemas.includes(schema));

    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        [
          'Proof environment is not at the seeded baseline.',
          missing.length > 0 ? `Missing schemas: ${missing.join(', ')}` : null,
          unexpected.length > 0 ? `Unexpected schemas: ${unexpected.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join(' ')
      );
    }

    const healthCheck = await client.query(
      `SELECT to_regclass('core.health_check') AS relation_name`
    );
    if (healthCheck.rows[0]?.relation_name !== 'core.health_check') {
      throw new Error(
        'Proof environment seeded baseline is missing core.health_check from docker init bootstrap.'
      );
    }
  });
}

async function cleanupTransientProofSchemas() {
  return withProofClient(async (client) => {
    const transientSchemas = listTransientProofSchemas(await listUserSchemas(client));

    for (const schema of transientSchemas) {
      await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    }

    const remaining = listTransientProofSchemas(await listUserSchemas(client));
    if (remaining.length > 0) {
      throw new Error(`Cleanup left transient proof schemas behind: ${remaining.join(', ')}`);
    }

    return transientSchemas;
  });
}

function runPostgresProofTest() {
  run(
    pnpmCommand,
    ['--filter', '@dvt/adapter-temporal', 'run', 'test:integration:postgres:local'],
    { env: buildPgEnv() }
  );
}

async function main() {
  const [action = 'test', ...flags] = process.argv.slice(2);
  const reset = flags.includes('--reset');
  const cleanupAfter = flags.includes('--cleanup-after');
  const downAfter = flags.includes('--down-after');

  if (action === 'down') {
    composeDown();
    return;
  }

  if (action === 'reset') {
    composeDown();
    composeUp();
    waitForHealthy();
    await verifySeededBaseline();
    return;
  }

  if (action === 'cleanup') {
    composeUp();
    waitForHealthy();
    const removedSchemas = await cleanupTransientProofSchemas();
    if (removedSchemas.length === 0) {
      console.log('[proof] No transient proof schemas needed cleanup.');
    } else {
      console.log(`[proof] Removed transient proof schemas: ${removedSchemas.join(', ')}`);
    }
    return;
  }

  if (action === 'up') {
    if (reset) {
      composeDown();
    }

    composeUp();
    waitForHealthy();
    if (reset) {
      await verifySeededBaseline();
    }
    return;
  }

  if (action === 'test') {
    if (reset) {
      composeDown();
    }

    composeUp();
    waitForHealthy();
    if (reset) {
      await verifySeededBaseline();
    }
    runPostgresProofTest();

    if (cleanupAfter) {
      await cleanupTransientProofSchemas();
    }

    if (downAfter) {
      composeDown();
    }

    return;
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
  defaultPgUrl,
  getProofPgUrl,
  buildPgEnv,
  composeDown,
  resetComposeCommandCache,
  proofBaselineSchemas,
  transientProofSchemaPatterns,
  isTransientProofSchema,
  listTransientProofSchemas,
};
