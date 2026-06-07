/**
 * Owned concern: canonical local Temporal posture for the coordinated dev stack.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_TEMPORAL_ADDRESS = '127.0.0.1:7233';
const DEFAULT_TEMPORAL_NAMESPACE = 'default';
const DEFAULT_TEMPORAL_TASK_QUEUE = 'dvt-temporal';
const DEFAULT_TEMPORAL_WORKER_ADMIN_PORT = 9468;
const DEFAULT_LOCAL_PROTECTED_RUNTIME_TENANT_ID = 'tenant';
const TEMPORAL_PACKAGE_ROOT = path.resolve(__dirname, '../packages/@dvt/adapter-temporal');
const TEMPORAL_CLI_ENV_PATH = 'DVT_TEMPORAL_CLI_PATH';
const TEMPORAL_CLI_CACHE_PREFIX = 'temporal-sdk-typescript-';
const TEMPORAL_CLI_READY_TIMEOUT_MS = 60_000;
const TEMPORAL_CLI_POLL_INTERVAL_MS = 250;

function readNonEmptyEnv(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function resolvePositivePort(value, name) {
  const configured = readNonEmptyEnv(value);
  if (configured === undefined) {
    return DEFAULT_TEMPORAL_WORKER_ADMIN_PORT;
  }

  const parsed = Number.parseInt(configured, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535 when provided`);
  }
  return parsed;
}

function resolveProbeHost(host) {
  const resolved = readNonEmptyEnv(host) ?? '127.0.0.1';
  return resolved === '0.0.0.0' || resolved === '::' ? '127.0.0.1' : resolved;
}

function resolveTemporalRuntimePosture(options, env = process.env) {
  const workerAdminHost = readNonEmptyEnv(env.DVT_TEMPORAL_ADMIN_HOST) ?? options.host;
  const workerAdminPort = resolvePositivePort(
    env.DVT_TEMPORAL_ADMIN_PORT,
    'DVT_TEMPORAL_ADMIN_PORT'
  );
  const workerReadyzUrl =
    readNonEmptyEnv(env.DVT_TEMPORAL_WORKER_READYZ_URL) ??
    `http://${resolveProbeHost(workerAdminHost)}:${workerAdminPort}/readyz`;

  return {
    address: readNonEmptyEnv(env.TEMPORAL_ADDRESS) ?? DEFAULT_TEMPORAL_ADDRESS,
    namespace: readNonEmptyEnv(env.TEMPORAL_NAMESPACE) ?? DEFAULT_TEMPORAL_NAMESPACE,
    taskQueue: readNonEmptyEnv(env.TEMPORAL_TASK_QUEUE) ?? DEFAULT_TEMPORAL_TASK_QUEUE,
    workerAdminHost,
    workerAdminPort,
    workerReadyzUrl,
  };
}

function buildTemporalApiEnv(options, env = process.env) {
  const posture = resolveTemporalRuntimePosture(options, env);
  return {
    TEMPORAL_ADDRESS: posture.address,
    TEMPORAL_NAMESPACE: posture.namespace,
    TEMPORAL_TASK_QUEUE: posture.taskQueue,
    DVT_TEMPORAL_WORKER_READYZ_URL: posture.workerReadyzUrl,
  };
}

function buildTemporalWorkerEnv(options, env = process.env, databaseUrl) {
  const resolvedDatabaseUrl = readNonEmptyEnv(databaseUrl);
  if (resolvedDatabaseUrl === undefined) {
    throw new Error('DATABASE_URL is required before starting the local Temporal worker');
  }

  const posture = resolveTemporalRuntimePosture(options, env);
  const workerTaskQueue =
    readNonEmptyEnv(env.TEMPORAL_TASK_QUEUE) ??
    toTenantScopedTaskQueue(posture.taskQueue, resolveLocalProtectedRuntimeTenantId(env));
  return {
    DATABASE_URL: resolvedDatabaseUrl,
    ...(readNonEmptyEnv(env.DVT_PG_SCHEMA) === undefined
      ? {}
      : { DVT_PG_SCHEMA: readNonEmptyEnv(env.DVT_PG_SCHEMA) }),
    TEMPORAL_ADDRESS: posture.address,
    TEMPORAL_NAMESPACE: posture.namespace,
    TEMPORAL_TASK_QUEUE: workerTaskQueue,
    DVT_TEMPORAL_ADMIN_HOST: posture.workerAdminHost,
    DVT_TEMPORAL_ADMIN_PORT: String(posture.workerAdminPort),
    DVT_TEMPORAL_WORKER_RUN_MIGRATIONS:
      readNonEmptyEnv(env.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS) ?? 'true',
    ...(readNonEmptyEnv(env.DVT_TEMPORAL_DBT_ENABLED) === undefined
      ? {}
      : { DVT_TEMPORAL_DBT_ENABLED: readNonEmptyEnv(env.DVT_TEMPORAL_DBT_ENABLED) }),
    ...(readNonEmptyEnv(env.DVT_DBT_BUNDLE_STORE_BACKEND) === undefined
      ? {}
      : { DVT_DBT_BUNDLE_STORE_BACKEND: readNonEmptyEnv(env.DVT_DBT_BUNDLE_STORE_BACKEND) }),
    ...(readNonEmptyEnv(env.DVT_DBT_BUNDLE_FILE_ROOT) === undefined
      ? {}
      : { DVT_DBT_BUNDLE_FILE_ROOT: readNonEmptyEnv(env.DVT_DBT_BUNDLE_FILE_ROOT) }),
    ...(readNonEmptyEnv(env.DVT_DBT_BUNDLE_S3_BUCKET) === undefined
      ? {}
      : { DVT_DBT_BUNDLE_S3_BUCKET: readNonEmptyEnv(env.DVT_DBT_BUNDLE_S3_BUCKET) }),
  };
}

function resolveLocalProtectedRuntimeTenantId(env = process.env) {
  return readNonEmptyEnv(env.VITE_DEFAULT_TENANT_ID) ?? DEFAULT_LOCAL_PROTECTED_RUNTIME_TENANT_ID;
}

function toTenantScopedTaskQueue(baseQueue, tenantId) {
  const normalizedTenantId = readNonEmptyEnv(tenantId);
  return normalizedTenantId === undefined ? baseQueue : `${baseQueue}-${normalizedTenantId}`;
}

function shouldStartTemporalWorker(env = process.env) {
  return Boolean(
    readNonEmptyEnv(env.DATABASE_URL) &&
    readNonEmptyEnv(env.OIDC_JWKS_URI) &&
    readNonEmptyEnv(env.OIDC_ISSUER) &&
    readNonEmptyEnv(env.OIDC_AUDIENCE)
  );
}

function shouldBootstrapLocalTemporal(env = process.env) {
  return shouldStartTemporalWorker(env) && readNonEmptyEnv(env.TEMPORAL_ADDRESS) === undefined;
}

function resolveTemporalCliExecutable(env = process.env, fsModule = fs, tmpDir = os.tmpdir()) {
  const explicitPath = readNonEmptyEnv(env[TEMPORAL_CLI_ENV_PATH]);
  if (explicitPath !== undefined) {
    return explicitPath;
  }

  let preferredVersion;
  try {
    const packageJsonPath = require.resolve('@temporalio/testing/package.json', {
      paths: [TEMPORAL_PACKAGE_ROOT],
    });
    preferredVersion = JSON.parse(fsModule.readFileSync(packageJsonPath, 'utf8')).version;
  } catch {
    preferredVersion = undefined;
  }

  const candidates = (() => {
    try {
      return fsModule
        .readdirSync(tmpDir)
        .filter((entry) => {
          if (!entry.startsWith(TEMPORAL_CLI_CACHE_PREFIX)) {
            return false;
          }
          return process.platform === 'win32' ? entry.endsWith('.exe') : !entry.endsWith('.sha256');
        })
        .map((entry) => {
          const fullPath = path.join(tmpDir, entry);
          const stat = fsModule.statSync(fullPath);
          return {
            fullPath,
            isPreferredVersion:
              preferredVersion !== undefined &&
              entry ===
                `${TEMPORAL_CLI_CACHE_PREFIX}${preferredVersion}${process.platform === 'win32' ? '.exe' : ''}`,
            mtimeMs: stat.mtimeMs,
            isFile: stat.isFile(),
          };
        })
        .filter((candidate) => candidate.isFile)
        .sort((left, right) => {
          if (left.isPreferredVersion !== right.isPreferredVersion) {
            return left.isPreferredVersion ? -1 : 1;
          }
          return right.mtimeMs - left.mtimeMs;
        });
    } catch {
      return [];
    }
  })();

  return candidates[0]?.fullPath;
}

function requireTemporalPackage(moduleId) {
  return require(require.resolve(moduleId, { paths: [TEMPORAL_PACKAGE_ROOT] }));
}

async function startTemporalSdkDevServer({ host, port, namespace }) {
  const { TestWorkflowEnvironment } = requireTemporalPackage('@temporalio/testing');
  const temporalEnv = await TestWorkflowEnvironment.createLocal({
    server: {
      ip: host,
      port,
      namespace,
      ui: false,
      log: { format: 'pretty', level: 'warn' },
      extraArgs: ['--disable-config-file', '--disable-config-env'],
    },
  });

  return {
    address: temporalEnv.address,
    namespace: temporalEnv.namespace ?? namespace,
    async close() {
      await temporalEnv.teardown();
    },
  };
}

async function allocateFreePort(host = '127.0.0.1') {
  const server = net.createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolve);
  });

  try {
    const address = server.address();
    if (!address || typeof address !== 'object') {
      throw new Error('Temporal local port allocation did not return a TCP address');
    }
    return address.port;
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

function buildTemporalCliStartDevArgs({ host, port, namespace }) {
  return [
    'server',
    'start-dev',
    '--ip',
    host,
    '--port',
    String(port),
    '--namespace',
    namespace,
    '--headless',
    '--disable-config-file',
    '--disable-config-env',
    '--log-level',
    'warn',
  ];
}

async function waitForTcpPort({
  host,
  port,
  child,
  timeoutMs = TEMPORAL_CLI_READY_TIMEOUT_MS,
  pollIntervalMs = TEMPORAL_CLI_POLL_INTERVAL_MS,
}) {
  const startedAt = Date.now();
  let lastError;
  let removeChildListeners = () => {};
  const childFailure = new Promise((_, reject) => {
    const onError = (error) => reject(error);
    const onExit = (exitCode, signal) => {
      const rendered = exitCode ?? signal ?? 'unknown';
      reject(new Error(`Temporal CLI exited before readiness (${rendered})`));
    };

    child.once('error', onError);
    child.once('exit', onExit);
    removeChildListeners = () => {
      child.off('error', onError);
      child.off('exit', onExit);
    };
  });

  try {
    while (Date.now() - startedAt < timeoutMs) {
      try {
        await Promise.race([
          new Promise((resolve, reject) => {
            const socket = net.createConnection({ host, port });
            socket.setTimeout(1_000);
            socket.once('connect', () => {
              socket.end();
              resolve();
            });
            socket.once('timeout', () => {
              socket.destroy(new Error(`Timed out connecting to ${host}:${port}`));
            });
            socket.once('error', reject);
          }),
          childFailure,
        ]);
        return;
      } catch (error) {
        lastError = error;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  } finally {
    removeChildListeners();
  }

  throw new Error(
    `Temporal CLI did not become reachable at ${host}:${port} within ${timeoutMs}ms. ` +
      `Last error: ${lastError?.message ?? 'unknown'}`
  );
}

async function terminateTemporalCliProcess(child, spawnProcess = spawn) {
  if (child.killed || child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawnProcess('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('exit', () => resolve());
      killer.on('error', () => resolve());
    });
    return;
  }

  child.kill('SIGTERM');
}

async function startTemporalCliDevServer(options = {}) {
  const host = readNonEmptyEnv(options.host) ?? '127.0.0.1';
  const namespace = readNonEmptyEnv(options.namespace) ?? DEFAULT_TEMPORAL_NAMESPACE;
  const port = options.port ?? (await allocateFreePort(host));
  const executablePath =
    readNonEmptyEnv(options.executablePath) ??
    resolveTemporalCliExecutable(
      options.env ?? process.env,
      options.fsModule ?? fs,
      options.tmpDir ?? os.tmpdir()
    );
  if (executablePath === undefined) {
    const startSdkDevServer = options.startTemporalSdkDevServer ?? startTemporalSdkDevServer;
    return startSdkDevServer({ host, namespace, port });
  }

  const spawnProcess = options.spawnProcess ?? spawn;
  const waitForPort = options.waitForTcpPort ?? waitForTcpPort;
  const terminateProcessTree = options.terminateProcessTree ?? terminateTemporalCliProcess;
  const output = [];

  const child = spawnProcess(
    executablePath,
    buildTemporalCliStartDevArgs({ host, port, namespace }),
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  const collectOutput = (source) => (chunk) => {
    output.push(`[${source}] ${Buffer.from(chunk).toString('utf8').trim()}`);
    if (output.length > 20) {
      output.shift();
    }
  };
  child.stdout?.on('data', collectOutput('stdout'));
  child.stderr?.on('data', collectOutput('stderr'));

  try {
    await waitForPort({
      host,
      port,
      child,
      timeoutMs: options.timeoutMs ?? TEMPORAL_CLI_READY_TIMEOUT_MS,
      pollIntervalMs: options.pollIntervalMs ?? TEMPORAL_CLI_POLL_INTERVAL_MS,
    });
  } catch (error) {
    await terminateProcessTree(child, spawnProcess);
    const renderedOutput = output.length > 0 ? ` Recent output: ${output.join('\n')}` : '';
    throw new Error(`${error.message}${renderedOutput}`, { cause: error });
  }

  return {
    address: `${host}:${port}`,
    namespace,
    async close() {
      await terminateProcessTree(child, spawnProcess);
    },
  };
}

async function startLocalTemporalService(options = {}) {
  return startTemporalCliDevServer(options);
}

module.exports = {
  DEFAULT_TEMPORAL_ADDRESS,
  DEFAULT_TEMPORAL_NAMESPACE,
  DEFAULT_TEMPORAL_TASK_QUEUE,
  DEFAULT_TEMPORAL_WORKER_ADMIN_PORT,
  DEFAULT_LOCAL_PROTECTED_RUNTIME_TENANT_ID,
  buildTemporalApiEnv,
  buildTemporalWorkerEnv,
  allocateFreePort,
  buildTemporalCliStartDevArgs,
  resolveTemporalCliExecutable,
  resolveTemporalRuntimePosture,
  shouldBootstrapLocalTemporal,
  shouldStartTemporalWorker,
  startTemporalCliDevServer,
  startTemporalSdkDevServer,
  startLocalTemporalService,
  terminateTemporalCliProcess,
  waitForTcpPort,
};
