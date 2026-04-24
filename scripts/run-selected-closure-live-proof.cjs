#!/usr/bin/env node
/**
 * Owned concern: boot a live protected-runtime browser proof lane for selected closure.
 */
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { Client } = require('pg');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');

const { defaultPgUrl } = require('./run-temporal-postgres-proof.cjs');
const {
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  seedLocalProtectedRuntimeGrant,
  startLocalProtectedRuntimeAuth,
} = require('./run-dev-stack.auth.cjs');

const PNPM_COMMAND = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const DEFAULT_API_PORT = 3300;
const DEFAULT_WEB_PORT = 4174;
const DEFAULT_READY_TIMEOUT_MS = 240_000;
const DEFAULT_POLL_INTERVAL_MS = 500;
const POSTGRES_BOOTSTRAP_SCRIPT = path.resolve(__dirname, 'run-temporal-postgres-proof.cjs');
const TEMPORAL_PACKAGE_ROOT = path.resolve(__dirname, '../packages/@dvt/adapter-temporal');
const SPEC_PATH = '/repo/apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts';
const CYPRESS_IMAGE = 'cypress/included:13.17.0';
const LOCAL_AUTH_HOST = '127.0.0.1';
const API_BIND_HOST = '0.0.0.0';
const WEB_BIND_HOST = '0.0.0.0';

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function allocateLiveProofSchema() {
  return `dvt_live_selected_closure_${Date.now()}_${process.pid}`;
}

function pipePrefixedOutput(stream, prefix) {
  const lineReader = readline.createInterface({ input: stream });
  lineReader.on('line', (line) => {
    console.log(`${prefix} ${line}`);
  });
  return lineReader;
}

function spawnProcess(name, args, envOverrides = {}) {
  const child = spawn(PNPM_COMMAND, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...envOverrides },
    shell: process.platform === 'win32',
    windowsHide: true,
  });

  return {
    name,
    child,
    stdoutReader: pipePrefixedOutput(child.stdout, `[${name}]`),
    stderrReader: pipePrefixedOutput(child.stderr, `[${name}]`),
  };
}

function request(url) {
  const transport = url.startsWith('https:') ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.get(
      url,
      {
        timeout: 5_000,
        headers: { Accept: 'application/json,text/html,*/*' },
      },
      (response) => {
        response.resume();
        resolve(response);
      }
    );

    req.on('timeout', () => req.destroy(new Error(`Timeout while requesting ${url}`)));
    req.on('error', reject);
  });
}

async function waitForUrl(url, validator, label) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < DEFAULT_READY_TIMEOUT_MS) {
    try {
      const response = await request(url);
      if (validator(response)) {
        return;
      }
      lastError = new Error(`${label} responded with ${response.statusCode}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
  }

  throw new Error(
    `${label} did not become ready within ${DEFAULT_READY_TIMEOUT_MS}ms. Last error: ${
      lastError?.message ?? 'unknown'
    }`
  );
}

function ensureLocalPostgresReady() {
  const result = spawnSync(process.execPath, [POSTGRES_BOOTSTRAP_SCRIPT, 'up'], {
    stdio: 'inherit',
    env: process.env,
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Local Postgres bootstrap failed with exit code ${result.status}`);
  }
}

async function loadTemporalTesting() {
  const temporalTestingEntry = require.resolve('@temporalio/testing', {
    paths: [TEMPORAL_PACKAGE_ROOT],
  });

  return import(pathToFileURL(temporalTestingEntry).href);
}

async function terminateProcess(processHandle) {
  if (processHandle.child.killed || processHandle.child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(processHandle.child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  processHandle.child.kill('SIGTERM');
}

async function closeReaders(processHandle) {
  processHandle.stdoutReader.close();
  processHandle.stderrReader.close();
}

async function dropSchemaIfExists(databaseUrl, schema) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
  } finally {
    await client.end();
  }
}

async function runCypress(args) {
  const repoRoot = path.resolve(__dirname, '..').replace(/\\/g, '/');
  const dockerArgs = [
    'run',
    '--rm',
    '-t',
    '-v',
    `${repoRoot}:/repo`,
    '-w',
    '/repo/apps/web',
    '-e',
    `CYPRESS_baseUrl=http://host.docker.internal:${args.webPort}`,
    '-e',
    `CYPRESS_apiBaseUrl=http://host.docker.internal:${args.apiPort}`,
    '-e',
    `CYPRESS_apiBearerToken=${args.apiBearerToken}`,
    '-e',
    `CYPRESS_workspaceTenantId=${args.workspaceScope.tenantId}`,
    '-e',
    `CYPRESS_workspaceProjectId=${args.workspaceScope.projectId}`,
    '-e',
    `CYPRESS_workspaceEnvironmentId=${args.workspaceScope.environmentId}`,
    CYPRESS_IMAGE,
    '--project',
    '/repo/apps/web',
    '--config-file',
    '/repo/apps/web/cypress.config.ts',
    '--spec',
    SPEC_PATH,
  ];

  const child = spawn('docker', dockerArgs, {
    stdio: 'inherit',
    windowsHide: true,
  });

  const [exitCode] = await once(child, 'exit');

  if (typeof exitCode !== 'number' || exitCode !== 0) {
    throw new Error(`Cypress live selected-closure proof failed with exit code ${exitCode}`);
  }
}

async function main() {
  ensureLocalPostgresReady();

  const { TestWorkflowEnvironment } = await loadTemporalTesting();
  const temporalEnv = await TestWorkflowEnvironment.createTimeSkipping();
  const localProtectedRuntimeAuth = await startLocalProtectedRuntimeAuth({
    env: process.env,
    host: LOCAL_AUTH_HOST,
  });
  const liveProofSchema = allocateLiveProofSchema();
  const processHandles = [];

  async function shutdown() {
    await Promise.all(processHandles.map((handle) => terminateProcess(handle)));
    await Promise.all(processHandles.map((handle) => closeReaders(handle)));
    await localProtectedRuntimeAuth.close();
    await temporalEnv.teardown();
  }

  try {
    const apiHandle = spawnProcess('api-live-proof', ['--filter', 'dvt-api', 'dev'], {
      HOST: API_BIND_HOST,
      PORT: String(DEFAULT_API_PORT),
      DATABASE_URL: defaultPgUrl,
      DVT_PG_SCHEMA: liveProofSchema,
      DVT_READYZ_ENABLED: 'true',
      DVT_VERSION_ENABLED: 'true',
      DVT_DB_READY_ENABLED: 'true',
      TEMPORAL_ADDRESS: temporalEnv.connection.options.address,
      TEMPORAL_NAMESPACE: temporalEnv.namespace,
      TEMPORAL_TASK_QUEUE: 'dvt-temporal',
      ...localProtectedRuntimeAuth.oidcEnv,
    });
    processHandles.push(apiHandle);

    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/healthz`,
      (response) => response.statusCode === 200,
      'API healthz'
    );
    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/db/ready`,
      (response) => response.statusCode === 200,
      'API db/ready'
    );
    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/readyz`,
      (response) => response.statusCode === 200,
      'API readyz'
    );
    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_API_PORT}/version`,
      (response) => response.statusCode === 200,
      'API version'
    );

    await seedLocalProtectedRuntimeGrant({
      databaseUrl: defaultPgUrl,
      schema: liveProofSchema,
      principalId: localProtectedRuntimeAuth.principalId,
      tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
      workspaceScope: localProtectedRuntimeAuth.workspaceScope,
    });

    const webHandle = spawnProcess(
      'web-live-proof',
      [
        '--filter',
        '@dvt/web',
        'exec',
        'vite',
        '--host',
        WEB_BIND_HOST,
        '--port',
        String(DEFAULT_WEB_PORT),
        '--strictPort',
      ],
      {
        VITE_DATA_SOURCE: 'api',
        VITE_API_BASE_URL: `http://host.docker.internal:${DEFAULT_API_PORT}`,
        VITE_API_BEARER_TOKEN: localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
        VITE_DEFAULT_TENANT_ID: localProtectedRuntimeAuth.workspaceScope.tenantId,
        VITE_DEFAULT_PROJECT_ID: localProtectedRuntimeAuth.workspaceScope.projectId,
        VITE_DEFAULT_ENVIRONMENT_ID: localProtectedRuntimeAuth.workspaceScope.environmentId,
        VITE_GIT_BRANCH: 'main',
        VITE_GIT_SHA: 'local',
        VITE_GIT_REPO: 'dunay2/dvt',
        VITE_GRAPH_ARTIFACT_PATH: 'pipelines/sales_pipeline.yaml',
        VITE_PLATFORM_HEALTH_OPTIONAL_PROBES: '',
      }
    );
    processHandles.push(webHandle);

    await waitForUrl(
      `http://127.0.0.1:${DEFAULT_WEB_PORT}/`,
      (response) => (response.statusCode ?? 500) < 500,
      'Web dev server'
    );

    await runCypress({
      apiPort: DEFAULT_API_PORT,
      webPort: DEFAULT_WEB_PORT,
      apiBearerToken: localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
      workspaceScope: localProtectedRuntimeAuth.workspaceScope,
    });
  } finally {
    await shutdown();
    await dropSchemaIfExists(defaultPgUrl, liveProofSchema);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
