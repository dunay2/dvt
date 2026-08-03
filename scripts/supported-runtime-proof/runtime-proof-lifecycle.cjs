'use strict';

const {
  LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS,
  seedLocalProtectedRuntimeGrant,
  startLocalProtectedRuntimeAuth,
} = require('../run-dev-stack.auth.cjs');
const {
  buildApiEnv,
  buildCoordinatedTemporalWorkerEnv,
  closeReaders,
  seedLocalPostgresProofData,
  spawnProcess,
  terminateProcess,
  waitForUrl,
  waitForUrlOrProcessExit,
} = require('../run-dev-stack.cjs');
const { allocateFreePort, startLocalTemporalService } = require('../run-dev-stack.temporal.cjs');
const {
  getProofPgUrl,
  resetPostgresProofStack,
  startPostgresContainer,
  stopPostgresContainer,
} = require('../run-temporal-postgres-proof.cjs');
const { startRuntimeProofEventSink } = require('./runtime-proof-event-sink.cjs');
const { createRuntimeProofApiClient } = require('./runtime-proof-http.cjs');
const { createRuntimeProofPostgresProbe } = require('./runtime-proof-postgres.cjs');

const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 100;

async function startSupportedRuntimeProofLifecycle(profile) {
  const host = '127.0.0.1';
  const databaseUrl = getProofPgUrl();
  const ports = await allocateRuntimePorts(host);
  const scopeEnv = buildScopeEnv(profile.scope);
  const processes = [];
  let outboxProcess = null;
  let postgresStopped = false;
  let auth = null;
  let temporal = null;
  let eventSink = null;

  const stopProcess = async (handle) => {
    if (handle === null) return;
    await terminateProcess(handle);
    await closeReaders(handle);
    const index = processes.indexOf(handle);
    if (index >= 0) processes.splice(index, 1);
  };

  const startOutbox = async () => {
    if (outboxProcess !== null) return;
    outboxProcess = spawnProcess(
      'runtime-proof-outbox',
      ['--filter', 'dvt-outbox-worker', 'start'],
      buildRuntimeProofOutboxEnv({
        databaseUrl,
        adminPort: ports.outboxAdmin,
        targetUrl: eventSink.targetUrl,
      })
    );
    processes.push(outboxProcess);
    await waitForUrlOrProcessExit(
      `http://${host}:${ports.outboxAdmin}/readyz`,
      (response) => response.statusCode === 200,
      READY_TIMEOUT_MS,
      POLL_INTERVAL_MS,
      'Runtime proof outbox worker',
      outboxProcess
    );
  };

  try {
    await resetPostgresProofStack();
    await seedLocalPostgresProofData(databaseUrl);
    auth = await startLocalProtectedRuntimeAuth({ env: scopeEnv, host });
    temporal = await startLocalTemporalService({ host });

    const stackOptions = {
      host,
      apiPort: ports.api,
      skipPostgres: false,
    };
    const apiEnv = buildApiEnv(stackOptions, {
      ...process.env,
      ...scopeEnv,
      ...auth.oidcEnv,
      DATABASE_URL: databaseUrl,
      DVT_ADMIN_ROUTES_ENABLED: 'true',
      DVT_PG_SCHEMA: 'dvt',
      DVT_TEMPORAL_ADMIN_HOST: host,
      DVT_TEMPORAL_ADMIN_PORT: String(ports.temporalWorkerAdmin),
      TEMPORAL_ADDRESS: temporal.address,
      TEMPORAL_NAMESPACE: temporal.namespace,
    });
    const apiProcess = spawnProcess('runtime-proof-api', ['--filter', 'dvt-api', 'start'], apiEnv);
    processes.push(apiProcess);
    await waitForUrlOrProcessExit(
      `http://${host}:${ports.api}/db/ready`,
      (response) => response.statusCode === 200,
      READY_TIMEOUT_MS,
      POLL_INTERVAL_MS,
      'Runtime proof API',
      apiProcess
    );

    await seedLocalProtectedRuntimeGrant({
      databaseUrl,
      schema: 'dvt',
      principalId: auth.principalId,
      tenantActions: [...LOCAL_PROTECTED_RUNTIME_TENANT_ACTIONS, 'admin:rebuild-snapshot'],
      workspaceScope: profile.scope,
    });

    const temporalWorkerEnv = buildCoordinatedTemporalWorkerEnv(stackOptions, {
      ...apiEnv,
      DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: 'false',
    });
    const temporalWorker = spawnProcess(
      'runtime-proof-temporal-worker',
      ['--filter', 'dvt-temporal-worker', 'start'],
      temporalWorkerEnv
    );
    processes.push(temporalWorker);
    await waitForUrlOrProcessExit(
      `http://${host}:${ports.temporalWorkerAdmin}/readyz`,
      (response) => response.statusCode === 200,
      READY_TIMEOUT_MS,
      POLL_INTERVAL_MS,
      'Runtime proof Temporal worker',
      temporalWorker
    );

    eventSink = await startRuntimeProofEventSink();
    await startOutbox();

    return {
      api: createRuntimeProofApiClient({
        baseUrl: `http://${host}:${ports.api}`,
        bearerToken: auth.webEnv.VITE_API_BEARER_TOKEN,
      }),
      postgres: createRuntimeProofPostgresProbe({ connectionString: databaseUrl, schema: 'dvt' }),
      eventSink,
      stopOutbox: async () => {
        await stopProcess(outboxProcess);
        outboxProcess = null;
      },
      startOutbox,
      stopPostgres: () => {
        stopPostgresContainer();
        postgresStopped = true;
      },
      startPostgres: () => {
        startPostgresContainer();
        postgresStopped = false;
      },
      waitForApiDatabase: () =>
        waitForUrl(
          `http://${host}:${ports.api}/db/ready`,
          (response) => response.statusCode === 200,
          profile.workload.postgresInterruption.recoveryTimeoutMs,
          POLL_INTERVAL_MS,
          'Runtime proof API database recovery'
        ),
      close: async () => {
        await Promise.all([...processes].reverse().map(stopProcess));
        await eventSink?.close();
        await temporal?.close();
        await auth?.close();
        if (postgresStopped) startPostgresContainer();
      },
    };
  } catch (error) {
    await Promise.all([...processes].reverse().map(stopProcess));
    await eventSink?.close();
    await temporal?.close();
    await auth?.close();
    if (postgresStopped) startPostgresContainer();
    throw error;
  }
}

function buildRuntimeProofOutboxEnv(options) {
  return {
    NODE_ENV: 'test',
    LOG_LEVEL: 'warn',
    SERVICE_NAME: 'dvt-supported-runtime-proof-outbox',
    DATABASE_URL: options.databaseUrl,
    DVT_PG_SCHEMA: 'dvt',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DVT_OUTBOX_EVENT_BUS_MODE: 'http',
    DVT_OUTBOX_HTTP_TARGET_URL: options.targetUrl,
    DVT_OUTBOX_ADMIN_HOST: '127.0.0.1',
    DVT_OUTBOX_ADMIN_PORT: String(options.adminPort),
    DVT_OUTBOX_SHARD_COUNT: '1',
    DVT_OUTBOX_OWNED_SHARD_IDS: '0',
    DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '50',
    DVT_OUTBOX_WORKER_BATCH_SIZE: '100',
    DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '100',
    DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'false',
    DVT_PURGE_ENABLED: 'false',
    DVT_RUN_EVENT_RETENTION_ENABLED: 'false',
  };
}

async function allocateRuntimePorts(host) {
  const [api, temporalWorkerAdmin, outboxAdmin] = await Promise.all([
    allocateFreePort(host),
    allocateFreePort(host),
    allocateFreePort(host),
  ]);
  return { api, temporalWorkerAdmin, outboxAdmin };
}

function buildScopeEnv(scope) {
  return {
    VITE_DEFAULT_TENANT_ID: scope.tenantId,
    VITE_DEFAULT_PROJECT_ID: scope.projectId,
    VITE_DEFAULT_ENVIRONMENT_ID: scope.environmentId,
  };
}

module.exports = {
  buildRuntimeProofOutboxEnv,
  startSupportedRuntimeProofLifecycle,
};
