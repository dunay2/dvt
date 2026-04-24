/**
 * Owned concern: canonical local Temporal posture for the coordinated dev stack.
 */

const DEFAULT_TEMPORAL_ADDRESS = '127.0.0.1:7233';
const DEFAULT_TEMPORAL_NAMESPACE = 'default';
const DEFAULT_TEMPORAL_TASK_QUEUE = 'dvt-temporal';
const DEFAULT_TEMPORAL_WORKER_ADMIN_PORT = 9468;

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
  return {
    DATABASE_URL: resolvedDatabaseUrl,
    ...(readNonEmptyEnv(env.DVT_PG_SCHEMA) === undefined
      ? {}
      : { DVT_PG_SCHEMA: readNonEmptyEnv(env.DVT_PG_SCHEMA) }),
    TEMPORAL_ADDRESS: posture.address,
    TEMPORAL_NAMESPACE: posture.namespace,
    TEMPORAL_TASK_QUEUE: posture.taskQueue,
    DVT_TEMPORAL_ADMIN_HOST: posture.workerAdminHost,
    DVT_TEMPORAL_ADMIN_PORT: String(posture.workerAdminPort),
    DVT_TEMPORAL_WORKER_RUN_MIGRATIONS:
      readNonEmptyEnv(env.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS) ?? 'true',
    ...(readNonEmptyEnv(env.DVT_TEMPORAL_DBT_ENABLED) === undefined
      ? {}
      : { DVT_TEMPORAL_DBT_ENABLED: readNonEmptyEnv(env.DVT_TEMPORAL_DBT_ENABLED) }),
  };
}

function shouldStartTemporalWorker(env = process.env) {
  return Boolean(
    readNonEmptyEnv(env.DATABASE_URL) &&
    readNonEmptyEnv(env.OIDC_JWKS_URI) &&
    readNonEmptyEnv(env.OIDC_ISSUER) &&
    readNonEmptyEnv(env.OIDC_AUDIENCE)
  );
}

module.exports = {
  DEFAULT_TEMPORAL_ADDRESS,
  DEFAULT_TEMPORAL_NAMESPACE,
  DEFAULT_TEMPORAL_TASK_QUEUE,
  DEFAULT_TEMPORAL_WORKER_ADMIN_PORT,
  buildTemporalApiEnv,
  buildTemporalWorkerEnv,
  resolveTemporalRuntimePosture,
  shouldStartTemporalWorker,
};
