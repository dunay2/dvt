#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const readline = require('node:readline');
const { defaultPgUrl } = require('./run-temporal-postgres-proof.cjs');
const {
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  seedLocalProtectedRuntimeGrant,
  shouldBootstrapLocalProtectedRuntimeAuth,
  startLocalProtectedRuntimeAuth,
} = require('./run-dev-stack.auth.cjs');
const {
  buildTemporalApiEnv,
  buildTemporalWorkerEnv,
  shouldBootstrapLocalTemporal,
  shouldStartTemporalWorker,
  startLocalTemporalService,
} = require('./run-dev-stack.temporal.cjs');

const DEFAULT_API_PORT = 3000;
const DEFAULT_WEB_PORT = 5173;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_READY_TIMEOUT_MS = 240_000;
const DEFAULT_POLL_INTERVAL_MS = 500;
const PNPM_COMMAND = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const POSTGRES_BOOTSTRAP_SCRIPT = path.resolve(__dirname, 'run-temporal-postgres-proof.cjs');
const WORKSPACE_RUNTIME_DEPENDENCIES_BUILD_SCRIPT = path.resolve(
  __dirname,
  'build-workspace-runtime-deps.cjs'
);
const DEFAULT_LOCAL_WORKSPACE_FILES_ROOT = path.resolve(
  __dirname,
  '../.dvt/dev-stack/workspace-files'
);
const DEFAULT_LOCAL_DBT_BUNDLE_FILE_ROOT = path.resolve(__dirname, '../.dvt/dev-stack/dbt-bundles');
const LOCAL_POSTGRES_CONNECTION_ID = 'local-postgres-proof';
const LOCAL_POSTGRES_CONNECTION_NAME = 'Local Postgres proof';
const LOCAL_POSTGRES_CREDENTIAL_REF = 'postgres:local-postgres-proof';

function parseArgs(argv) {
  const parsed = {
    apiPort: DEFAULT_API_PORT,
    webPort: DEFAULT_WEB_PORT,
    host: DEFAULT_HOST,
    readyTimeoutMs: DEFAULT_READY_TIMEOUT_MS,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    skipPostgres: false,
    testOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    switch (current) {
      case '--api-port':
        parsed.apiPort = parsePositiveInt(next, '--api-port');
        index += 1;
        break;
      case '--web-port':
        parsed.webPort = parsePositiveInt(next, '--web-port');
        index += 1;
        break;
      case '--host':
        if (!next) {
          throw new Error('Missing value for --host');
        }
        parsed.host = next;
        index += 1;
        break;
      case '--ready-timeout-ms':
        parsed.readyTimeoutMs = parsePositiveInt(next, '--ready-timeout-ms');
        index += 1;
        break;
      case '--poll-interval-ms':
        parsed.pollIntervalMs = parsePositiveInt(next, '--poll-interval-ms');
        index += 1;
        break;
      case '--skip-postgres':
        parsed.skipPostgres = true;
        break;
      case '--test-only':
        parsed.testOnly = true;
        break;
      default:
        throw new Error(`Unsupported argument: ${current}`);
    }
  }

  return parsed;
}

function readNonEmptyEnv(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function parsePositiveInt(value, flagName) {
  if (!value) {
    throw new Error(`Missing value for ${flagName}`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer for ${flagName}: ${value}`);
  }

  return parsed;
}

function resolveDatabaseUrl(options, env = process.env) {
  return readNonEmptyEnv(env.DATABASE_URL) ?? (options.skipPostgres ? undefined : defaultPgUrl);
}

function shouldBootstrapLocalPostgres(options, env = process.env) {
  return !options.skipPostgres && readNonEmptyEnv(env.DATABASE_URL) === undefined;
}

function buildApiEnv(options, env = process.env) {
  const databaseUrl = resolveDatabaseUrl(options, env);
  const temporalEnv = databaseUrl === undefined ? {} : buildTemporalApiEnv(options, env);
  const dbtArtifactEnv = buildLocalDbtArtifactEnv(env);

  return {
    ...env,
    HOST: options.host,
    PORT: String(options.apiPort),
    DVT_READYZ_ENABLED: 'true',
    ...dbtArtifactEnv,
    ...temporalEnv,
    ...(databaseUrl === undefined
      ? {}
      : {
          DATABASE_URL: databaseUrl,
          DVT_POSTGRES_CREDENTIAL_BINDINGS:
            readNonEmptyEnv(env.DVT_POSTGRES_CREDENTIAL_BINDINGS) ??
            JSON.stringify({ [LOCAL_POSTGRES_CREDENTIAL_REF]: databaseUrl }),
          DVT_DB_READY_ENABLED: 'true',
        }),
  };
}

function buildLocalDbtArtifactEnv(env = process.env) {
  const configuredBundleBackend = readNonEmptyEnv(env.DVT_DBT_BUNDLE_STORE_BACKEND);
  const configuredBundleRoot = readNonEmptyEnv(env.DVT_DBT_BUNDLE_FILE_ROOT);
  const configuredWorkspaceRoot = readNonEmptyEnv(env.DVT_WORKSPACE_FILES_ROOT);

  return {
    DVT_DBT_BUNDLE_STORE_BACKEND: configuredBundleBackend ?? 'file',
    DVT_DBT_BUNDLE_FILE_ROOT: configuredBundleRoot ?? DEFAULT_LOCAL_DBT_BUNDLE_FILE_ROOT,
    DVT_WORKSPACE_FILES_ROOT: configuredWorkspaceRoot ?? DEFAULT_LOCAL_WORKSPACE_FILES_ROOT,
  };
}

function buildCoordinatedTemporalWorkerEnv(options, apiEnv, sourceEnv = process.env) {
  const workerEnvBase = { ...apiEnv };
  delete workerEnvBase.TEMPORAL_TASK_QUEUE;
  const explicitWorkerTaskQueue = readNonEmptyEnv(sourceEnv.TEMPORAL_TASK_QUEUE);

  return buildTemporalWorkerEnv(
    options,
    {
      ...workerEnvBase,
      ...(explicitWorkerTaskQueue === undefined
        ? {}
        : { TEMPORAL_TASK_QUEUE: explicitWorkerTaskQueue }),
    },
    apiEnv.DATABASE_URL
  );
}

function ensureLocalPostgresReady(options, env = process.env) {
  if (!shouldBootstrapLocalPostgres(options, env)) {
    return;
  }

  console.log('[dev-stack] DATABASE_URL not set; bootstrapping local Docker Postgres proof stack');
  const result = spawnSync(process.execPath, [POSTGRES_BOOTSTRAP_SCRIPT, 'up'], {
    stdio: 'inherit',
    env,
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Local Postgres bootstrap failed with exit code ${result.status}`);
  }
}

function prepareTemporalWorkerRuntimeDependencies(apiEnv, { spawnCommand = spawnSync } = {}) {
  if (!shouldStartTemporalWorker(apiEnv)) {
    return false;
  }

  console.log('[dev-stack] Building Temporal worker runtime workspace dependencies');
  const result = spawnCommand(
    process.execPath,
    [WORKSPACE_RUNTIME_DEPENDENCIES_BUILD_SCRIPT, 'dvt-temporal-worker'],
    {
      stdio: 'inherit',
      env: process.env,
      windowsHide: true,
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Temporal worker runtime dependency build failed with exit code ${result.status}`
    );
  }

  return true;
}

function buildLocalPostgresProofSeedSql() {
  return `
CREATE SCHEMA IF NOT EXISTS raw;

DROP TABLE IF EXISTS public.source_1;
CREATE TABLE public.source_1 (
  order_id integer PRIMARY KEY,
  customer text NOT NULL,
  amount numeric(12, 2) NOT NULL
);
INSERT INTO public.source_1 (order_id, customer, amount) VALUES
  (1, 'Ada', 125.50),
  (2, 'Grace', 98.00),
  (3, 'Linus', 212.75);
ANALYZE public.source_1;

DROP TABLE IF EXISTS raw.orders;
CREATE TABLE raw.orders (
  order_id integer PRIMARY KEY,
  customer text NOT NULL,
  amount numeric(12, 2) NOT NULL
);
INSERT INTO raw.orders (order_id, customer, amount) VALUES
  (1, 'Ada', 125.50),
  (2, 'Grace', 98.00),
  (3, 'Linus', 212.75);
ANALYZE raw.orders;
`.trim();
}

function buildLocalWarehouseConnectionRequest() {
  return {
    name: LOCAL_POSTGRES_CONNECTION_NAME,
    type: 'postgres',
    database: 'dvt',
    credentialRef: LOCAL_POSTGRES_CREDENTIAL_REF,
  };
}

async function seedLocalPostgresProofData(databaseUrl) {
  const { Client } = require('pg');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(buildLocalPostgresProofSeedSql());
  } finally {
    await client.end();
  }
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

  const stdoutReader = pipePrefixedOutput(child.stdout, `[${name}]`);
  const stderrReader = pipePrefixedOutput(child.stderr, `[${name}]`);

  return { child, stdoutReader, stderrReader, name };
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

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout while requesting ${url}`));
    });
    req.on('error', reject);
  });
}

function sendJsonCommand(url, bearerToken, payload, timeoutMs = 15_000) {
  const body = JSON.stringify(payload);
  const endpoint = new URL(url);
  const transport = endpoint.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      endpoint,
      {
        method: 'POST',
        timeout: timeoutMs,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode ?? 500,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout while sending command to ${url}`));
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function ensureLocalWarehouseConnectionViaApi(args) {
  const endpoint = new URL('/workspace/warehouse/connections', `${args.apiBaseUrl}/`);
  endpoint.searchParams.set('tenantId', args.workspaceScope.tenantId);
  endpoint.searchParams.set('projectId', args.workspaceScope.projectId);
  endpoint.searchParams.set('environmentId', args.workspaceScope.environmentId);

  const response = await sendJsonCommand(
    endpoint.href,
    args.bearerToken,
    buildLocalWarehouseConnectionRequest(),
    args.commandTimeoutMs
  );
  if (response.statusCode === 201) {
    return response.statusCode;
  }

  let responseReason;
  try {
    responseReason = JSON.parse(response.body)?.error?.reason;
  } catch {
    responseReason = undefined;
  }

  if (response.statusCode !== 409 || responseReason !== 'warehouse_connection_duplicate') {
    throw new Error(
      `Local warehouse connection command failed with ${response.statusCode}: ${response.body}`
    );
  }

  return response.statusCode;
}

async function waitForUrl(url, validator, timeoutMs, pollIntervalMs, label) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await request(url);
      if (validator(response)) {
        return;
      }
      lastError = new Error(`${label} responded with ${response.statusCode}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `${label} did not become ready within ${timeoutMs}ms. Last error: ${lastError?.message ?? 'unknown'}`
  );
}

async function waitForUrlOrProcessExit(
  url,
  validator,
  timeoutMs,
  pollIntervalMs,
  label,
  processHandle,
  onReady = () => {}
) {
  let settled = false;
  let removeExitListener = () => {};
  const childExit = new Promise((_, reject) => {
    const onExit = (exitCode, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      const rendered = exitCode ?? signal ?? 'unknown';
      reject(new Error(`${label} bootstrap process exited before readiness (${rendered})`));
    };

    processHandle.child.once('exit', onExit);
    removeExitListener = () => processHandle.child.off('exit', onExit);
  });

  try {
    await Promise.race([
      waitForUrl(url, validator, timeoutMs, pollIntervalMs, label).then(() => {
        if (settled) {
          return;
        }

        settled = true;
        onReady();
        removeExitListener();
      }),
      childExit,
    ]);
  } finally {
    settled = true;
    removeExitListener();
  }
}

const PROCESS_TERMINATION_TIMEOUT_MS = 5_000;

async function terminateProcess(processHandle, options = {}) {
  const child = processHandle.child;
  if (hasProcessExited(child)) {
    return;
  }

  const platform = options.platform ?? process.platform;
  const gracefulTimeoutMs = options.gracefulTimeoutMs ?? PROCESS_TERMINATION_TIMEOUT_MS;
  const forceTimeoutMs = options.forceTimeoutMs ?? PROCESS_TERMINATION_TIMEOUT_MS;

  if (platform === 'win32') {
    await runTaskkill(child.pid, false, options.spawnProcess ?? spawn);
  } else {
    child.kill('SIGTERM');
  }

  if (await waitForProcessExit(child, gracefulTimeoutMs)) {
    return;
  }

  if (platform === 'win32') {
    await runTaskkill(child.pid, true, options.spawnProcess ?? spawn);
  } else {
    child.kill('SIGKILL');
  }

  if (!(await waitForProcessExit(child, forceTimeoutMs))) {
    throw new Error(`${processHandle.name} did not exit after forced termination`);
  }
}

function hasProcessExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitForProcessExit(child, timeoutMs) {
  if (hasProcessExited(child)) return true;

  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    const timeout = setTimeout(() => {
      child.off('exit', onExit);
      resolve(false);
    }, timeoutMs);
    child.once('exit', onExit);
  });
}

async function runTaskkill(pid, force, spawnProcess) {
  await new Promise((resolve) => {
    const args = ['/pid', String(pid), '/t', ...(force ? ['/f'] : [])];
    const killer = spawnProcess('taskkill', args, {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.on('exit', () => resolve());
    killer.on('error', () => resolve());
  });
}

async function closeReaders(processHandle) {
  processHandle.stdoutReader.close();
  processHandle.stderrReader.close();
}

function resolveProcessStartupOrder(apiEnv) {
  return shouldStartTemporalWorker(apiEnv) ? ['api', 'temporal-worker', 'web'] : ['api', 'web'];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const apiBaseUrl = `http://${options.host}:${options.apiPort}`;
  const webBaseUrl = `http://${options.host}:${options.webPort}`;
  const databaseUrl = resolveDatabaseUrl(options);
  const seedLocalWarehouseProof = Boolean(
    databaseUrl && shouldBootstrapLocalPostgres(options, process.env)
  );
  let localProtectedRuntimeAuth;
  let localTemporalService;

  console.log(`[dev-stack] Starting API on ${apiBaseUrl}`);
  console.log(`[dev-stack] Starting Web on ${webBaseUrl}`);

  ensureLocalPostgresReady(options);

  if (databaseUrl && shouldBootstrapLocalProtectedRuntimeAuth(process.env)) {
    console.log('[dev-stack] OIDC not set; bootstrapping local protected-runtime auth');
    localProtectedRuntimeAuth = await startLocalProtectedRuntimeAuth({
      env: process.env,
      host: options.host,
    });
  }

  const bootstrapEnv = {
    ...process.env,
    ...(localProtectedRuntimeAuth?.oidcEnv ?? {}),
    ...(databaseUrl === undefined ? {} : { DATABASE_URL: databaseUrl }),
  };

  if (shouldBootstrapLocalTemporal(bootstrapEnv)) {
    console.log('[dev-stack] TEMPORAL_ADDRESS not set; bootstrapping local Temporal dev service');
    localTemporalService = await startLocalTemporalService();
  }

  const apiEnv = buildApiEnv(options, {
    ...process.env,
    ...(localProtectedRuntimeAuth?.oidcEnv ?? {}),
    ...(localTemporalService
      ? {
          TEMPORAL_ADDRESS: localTemporalService.address,
          TEMPORAL_NAMESPACE: localTemporalService.namespace,
        }
      : {}),
  });
  if (seedLocalWarehouseProof && apiEnv.DATABASE_URL) {
    console.log('[dev-stack] Seeding local Postgres proof source data');
    await seedLocalPostgresProofData(apiEnv.DATABASE_URL);
  }
  const processHandles = [];
  let shuttingDown = false;
  const exitWatchers = [];

  function trackProcess(handle) {
    processHandles.push(handle);
    return handle;
  }

  function watchProcessExit(handle) {
    exitWatchers.push(
      (async () => {
        const [exitCode, signal] = await once(handle.child, 'exit');
        if (shuttingDown) {
          return;
        }

        const rendered = exitCode ?? signal ?? 'unknown';
        console.error(
          `[dev-stack] ${handle.name} exited before coordinated shutdown (${rendered})`
        );
        await shutdown(typeof exitCode === 'number' ? exitCode : 1);
      })()
    );
    return handle;
  }

  function registerProcess(handle) {
    return watchProcessExit(trackProcess(handle));
  }

  async function shutdown(exitCode = 0) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    await Promise.all(processHandles.map((handle) => terminateProcess(handle)));
    await Promise.all(processHandles.map((handle) => closeReaders(handle)));
    if (localProtectedRuntimeAuth) {
      await localProtectedRuntimeAuth.close();
    }
    if (localTemporalService) {
      await localTemporalService.close();
    }
    process.exit(exitCode);
  }

  process.on('SIGINT', () => {
    console.log('[dev-stack] Received SIGINT, shutting down');
    void shutdown(0);
  });
  process.on('SIGTERM', () => {
    console.log('[dev-stack] Received SIGTERM, shutting down');
    void shutdown(0);
  });

  try {
    const processStartupOrder = resolveProcessStartupOrder(apiEnv);

    prepareTemporalWorkerRuntimeDependencies(apiEnv);

    registerProcess(spawnProcess('api', ['--filter', 'dvt-api', 'dev'], apiEnv));

    await waitForUrl(
      `${apiBaseUrl}/healthz`,
      (response) => response.statusCode === 200,
      options.readyTimeoutMs,
      options.pollIntervalMs,
      'API healthz'
    );
    if (apiEnv.DATABASE_URL) {
      await waitForUrl(
        `${apiBaseUrl}/db/ready`,
        (response) => response.statusCode === 200,
        options.readyTimeoutMs,
        options.pollIntervalMs,
        'API db/ready'
      );
    }

    if (localProtectedRuntimeAuth && apiEnv.DATABASE_URL) {
      const seededGrant = await seedLocalProtectedRuntimeGrant({
        databaseUrl: apiEnv.DATABASE_URL,
        schema: apiEnv.DVT_PG_SCHEMA,
        principalId: localProtectedRuntimeAuth.principalId,
        tenantActions: LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
        workspaceScope: localProtectedRuntimeAuth.workspaceScope,
      });

      console.log(
        `[dev-stack] Seeded local protected-runtime grant for ${seededGrant.principalId} ` +
          `(${seededGrant.workspaceScope.tenantId}/${seededGrant.workspaceScope.projectId}/` +
          `${seededGrant.workspaceScope.environmentId})`
      );

      if (seedLocalWarehouseProof) {
        const statusCode = await ensureLocalWarehouseConnectionViaApi({
          apiBaseUrl,
          bearerToken: localProtectedRuntimeAuth.webEnv.VITE_API_BEARER_TOKEN,
          workspaceScope: localProtectedRuntimeAuth.workspaceScope,
        });
        console.log(
          `[dev-stack] Local warehouse connection ${statusCode === 201 ? 'created' : 'already exists'}`
        );
      }
    }

    if (processStartupOrder.includes('temporal-worker')) {
      console.log('[dev-stack] Starting Temporal worker; waiting for worker readiness');
      const temporalWorker = trackProcess(
        spawnProcess(
          'temporal-worker',
          ['--filter', 'dvt-temporal-worker', 'dev'],
          buildCoordinatedTemporalWorkerEnv(options, apiEnv)
        )
      );
      await waitForUrlOrProcessExit(
        apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL,
        (response) => response.statusCode === 200,
        options.readyTimeoutMs,
        options.pollIntervalMs,
        'Temporal worker readyz',
        temporalWorker,
        () => watchProcessExit(temporalWorker)
      );
    }

    registerProcess(
      spawnProcess(
        'web',
        [
          '--filter',
          '@dvt/web',
          'exec',
          'vite',
          '--host',
          options.host,
          '--port',
          String(options.webPort),
          '--strictPort',
        ],
        {
          VITE_API_BASE_URL: apiBaseUrl,
          VITE_PLATFORM_HEALTH_OPTIONAL_PROBES: '',
          ...(localProtectedRuntimeAuth?.webEnv ?? {}),
        }
      )
    );
    await waitForUrl(
      `${webBaseUrl}/`,
      (response) => (response.statusCode ?? 500) < 500,
      options.readyTimeoutMs,
      options.pollIntervalMs,
      'Web dev server'
    );
  } catch (error) {
    console.error(`[dev-stack] Startup failed: ${error.message}`);
    await shutdown(1);
    return;
  }

  console.log(`[dev-stack] API ready at ${apiBaseUrl}/healthz`);
  console.log(`[dev-stack] Web ready at ${webBaseUrl}/`);

  if (options.testOnly) {
    console.log('[dev-stack] Test-only mode complete, shutting down');
    await shutdown(0);
    return;
  }

  console.log('[dev-stack] Press Ctrl+C to stop both processes');
  await Promise.all(exitWatchers);
}

module.exports = {
  parseArgs,
  resolveDatabaseUrl,
  shouldBootstrapLocalPostgres,
  buildApiEnv,
  buildLocalDbtArtifactEnv,
  buildCoordinatedTemporalWorkerEnv,
  buildTemporalWorkerEnv,
  shouldBootstrapLocalTemporal,
  shouldStartTemporalWorker,
  resolveProcessStartupOrder,
  prepareTemporalWorkerRuntimeDependencies,
  buildLocalPostgresProofSeedSql,
  LOCAL_POSTGRES_CONNECTION_ID,
  buildLocalWarehouseConnectionRequest,
  seedLocalPostgresProofData,
  ensureLocalWarehouseConnectionViaApi,
  spawnProcess,
  waitForUrl,
  waitForUrlOrProcessExit,
  terminateProcess,
  closeReaders,
};

if (require.main === module) {
  main().catch(async (error) => {
    console.error(`[dev-stack] Fatal error: ${error.message}`);
    process.exit(1);
  });
}
