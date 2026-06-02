const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const http = require('node:http');

const {
  parseArgs,
  resolveDatabaseUrl,
  shouldBootstrapLocalPostgres,
  buildApiEnv,
  buildCoordinatedTemporalWorkerEnv,
  buildTemporalWorkerEnv,
  shouldBootstrapLocalTemporal,
  shouldStartTemporalWorker,
  resolveProcessStartupOrder,
  buildLocalPostgresProofSeedSql,
  buildLocalWarehouseConnectionCatalog,
  waitForUrlOrProcessExit,
} = require('./run-dev-stack.cjs');
const { startLocalTemporalService } = require('./run-dev-stack.temporal.cjs');
const { defaultPgUrl } = require('./run-temporal-postgres-proof.cjs');

test('parseArgs enables skip-postgres explicitly', () => {
  const options = parseArgs(['--host', '0.0.0.0', '--skip-postgres', '--test-only']);

  assert.equal(options.host, '0.0.0.0');
  assert.equal(options.skipPostgres, true);
  assert.equal(options.testOnly, true);
});

test('resolveDatabaseUrl prefers explicit environment configuration', () => {
  const databaseUrl = resolveDatabaseUrl(
    { skipPostgres: false },
    { DATABASE_URL: 'postgresql://custom-user:custom-pass@db.example.com:5432/dvt' }
  );

  assert.equal(databaseUrl, 'postgresql://custom-user:custom-pass@db.example.com:5432/dvt');
});

test('resolveDatabaseUrl falls back to canonical local postgres when not configured', () => {
  const databaseUrl = resolveDatabaseUrl({ skipPostgres: false }, {});

  assert.equal(databaseUrl, defaultPgUrl);
});

test('shouldBootstrapLocalPostgres only triggers when DATABASE_URL is absent and bootstrap is enabled', () => {
  assert.equal(shouldBootstrapLocalPostgres({ skipPostgres: false }, {}), true);
  assert.equal(
    shouldBootstrapLocalPostgres(
      { skipPostgres: false },
      { DATABASE_URL: 'postgresql://configured.example/dvt' }
    ),
    false
  );
  assert.equal(shouldBootstrapLocalPostgres({ skipPostgres: true }, {}), false);
});

test('buildApiEnv injects readiness flags and local postgres defaults for the coordinated stack', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    {}
  );

  assert.equal(apiEnv.HOST, '127.0.0.1');
  assert.equal(apiEnv.PORT, '3000');
  assert.equal(apiEnv.DVT_READYZ_ENABLED, 'true');
  assert.equal(apiEnv.DVT_DB_READY_ENABLED, 'true');
  assert.equal(apiEnv.DATABASE_URL, defaultPgUrl);
  assert.equal(apiEnv.TEMPORAL_ADDRESS, '127.0.0.1:7233');
  assert.equal(apiEnv.TEMPORAL_NAMESPACE, 'default');
  assert.equal(apiEnv.TEMPORAL_TASK_QUEUE, 'dvt-temporal');
  assert.equal(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL, 'http://127.0.0.1:9468/readyz');
  assert.equal(apiEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.match(apiEnv.DVT_DBT_BUNDLE_FILE_ROOT, /[\\/]\.dvt[\\/]dev-stack[\\/]dbt-bundles$/);
  assert.match(apiEnv.DVT_WORKSPACE_FILES_ROOT, /[\\/]\.dvt[\\/]dev-stack[\\/]workspace-files$/);
});

test('buildApiEnv leaves database unset when postgres bootstrap is explicitly skipped', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: true,
    },
    {}
  );

  assert.equal(apiEnv.HOST, '127.0.0.1');
  assert.equal(apiEnv.PORT, '3000');
  assert.equal(apiEnv.DVT_READYZ_ENABLED, 'true');
  assert.equal(apiEnv.DVT_DB_READY_ENABLED, undefined);
  assert.equal(apiEnv.DATABASE_URL, undefined);
  assert.equal(apiEnv.TEMPORAL_ADDRESS, undefined);
  assert.equal(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL, undefined);
});

test('buildApiEnv preserves explicit temporal posture when provided', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    {
      TEMPORAL_ADDRESS: 'temporal.dev:7233',
      TEMPORAL_NAMESPACE: 'dev',
      TEMPORAL_TASK_QUEUE: 'dev-task-queue',
      DVT_TEMPORAL_WORKER_READYZ_URL: 'http://temporal-worker.dev/readyz',
      DVT_DBT_BUNDLE_STORE_BACKEND: 'file',
      DVT_DBT_BUNDLE_FILE_ROOT: 'C:\\custom\\dbt-bundles',
      DVT_WORKSPACE_FILES_ROOT: 'C:\\custom\\workspace-files',
    }
  );

  assert.equal(apiEnv.TEMPORAL_ADDRESS, 'temporal.dev:7233');
  assert.equal(apiEnv.TEMPORAL_NAMESPACE, 'dev');
  assert.equal(apiEnv.TEMPORAL_TASK_QUEUE, 'dev-task-queue');
  assert.equal(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL, 'http://temporal-worker.dev/readyz');
  assert.equal(apiEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(apiEnv.DVT_DBT_BUNDLE_FILE_ROOT, 'C:\\custom\\dbt-bundles');
  assert.equal(apiEnv.DVT_WORKSPACE_FILES_ROOT, 'C:\\custom\\workspace-files');
});

test('buildTemporalWorkerEnv injects local protected-runtime tenant queue posture', () => {
  const workerEnv = buildTemporalWorkerEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    {},
    defaultPgUrl
  );

  assert.equal(workerEnv.DATABASE_URL, defaultPgUrl);
  assert.equal(workerEnv.TEMPORAL_ADDRESS, '127.0.0.1:7233');
  assert.equal(workerEnv.TEMPORAL_NAMESPACE, 'default');
  assert.equal(workerEnv.TEMPORAL_TASK_QUEUE, 'dvt-temporal-tenant');
  assert.equal(workerEnv.DVT_TEMPORAL_ADMIN_HOST, '127.0.0.1');
  assert.equal(workerEnv.DVT_TEMPORAL_ADMIN_PORT, '9468');
  assert.equal(workerEnv.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS, 'true');
});

test('buildTemporalWorkerEnv derives local worker queue from configured default tenant', () => {
  const workerEnv = buildTemporalWorkerEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    { VITE_DEFAULT_TENANT_ID: 'tenant-b' },
    defaultPgUrl
  );

  assert.equal(workerEnv.TEMPORAL_TASK_QUEUE, 'dvt-temporal-tenant-b');
});

test('buildTemporalWorkerEnv preserves explicit temporal worker queue', () => {
  const workerEnv = buildTemporalWorkerEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    { TEMPORAL_TASK_QUEUE: 'operator-owned-queue' },
    defaultPgUrl
  );

  assert.equal(workerEnv.TEMPORAL_TASK_QUEUE, 'operator-owned-queue');
});

test('buildCoordinatedTemporalWorkerEnv derives worker queue from local tenant, not API base queue', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    {}
  );

  const workerEnv = buildCoordinatedTemporalWorkerEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    apiEnv,
    {}
  );

  assert.equal(apiEnv.TEMPORAL_TASK_QUEUE, 'dvt-temporal');
  assert.equal(workerEnv.TEMPORAL_TASK_QUEUE, 'dvt-temporal-tenant');
});

test('buildCoordinatedTemporalWorkerEnv preserves operator-owned worker queue', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    { TEMPORAL_TASK_QUEUE: 'api-base-queue' }
  );

  const workerEnv = buildCoordinatedTemporalWorkerEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    apiEnv,
    { TEMPORAL_TASK_QUEUE: 'operator-owned-worker-queue' }
  );

  assert.equal(apiEnv.TEMPORAL_TASK_QUEUE, 'api-base-queue');
  assert.equal(workerEnv.TEMPORAL_TASK_QUEUE, 'operator-owned-worker-queue');
});

test('buildTemporalWorkerEnv forwards configured DBT bundle store settings', () => {
  const workerEnv = buildTemporalWorkerEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    {
      DVT_DBT_BUNDLE_STORE_BACKEND: 'file',
      DVT_DBT_BUNDLE_FILE_ROOT: 'C:\\custom\\dbt-bundles',
    },
    defaultPgUrl
  );

  assert.equal(workerEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(workerEnv.DVT_DBT_BUNDLE_FILE_ROOT, 'C:\\custom\\dbt-bundles');
});

test('shouldStartTemporalWorker follows protected runtime posture', () => {
  assert.equal(
    shouldStartTemporalWorker({
      DATABASE_URL: defaultPgUrl,
      OIDC_JWKS_URI: 'http://127.0.0.1:4000/.well-known/jwks.json',
      OIDC_ISSUER: 'https://issuer.local.dvt/',
      OIDC_AUDIENCE: 'dvt-api',
    }),
    true
  );
  assert.equal(shouldStartTemporalWorker({ DATABASE_URL: defaultPgUrl }), false);
});

test('shouldBootstrapLocalTemporal only fills the local protected-runtime Temporal gap', () => {
  const protectedRuntimeEnv = {
    DATABASE_URL: defaultPgUrl,
    OIDC_JWKS_URI: 'http://127.0.0.1:4000/.well-known/jwks.json',
    OIDC_ISSUER: 'https://issuer.local.dvt/',
    OIDC_AUDIENCE: 'dvt-api',
  };

  assert.equal(shouldBootstrapLocalTemporal(protectedRuntimeEnv), true);
  assert.equal(
    shouldBootstrapLocalTemporal({
      ...protectedRuntimeEnv,
      TEMPORAL_ADDRESS: 'temporal.dev:7233',
    }),
    false
  );
  assert.equal(shouldBootstrapLocalTemporal({ DATABASE_URL: defaultPgUrl }), false);
});

test('resolveProcessStartupOrder starts api before temporal worker to avoid dist-watch port churn', () => {
  const protectedRuntimeEnv = {
    DATABASE_URL: defaultPgUrl,
    OIDC_JWKS_URI: 'http://127.0.0.1:4000/.well-known/jwks.json',
    OIDC_ISSUER: 'https://issuer.local.dvt/',
    OIDC_AUDIENCE: 'dvt-api',
  };

  assert.deepEqual(resolveProcessStartupOrder(protectedRuntimeEnv), [
    'api',
    'temporal-worker',
    'web',
  ]);
  assert.deepEqual(resolveProcessStartupOrder({}), ['api', 'web']);
});

test('buildLocalPostgresProofSeedSql creates real default source tables for Canvas runs', () => {
  const sql = buildLocalPostgresProofSeedSql();

  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS raw/);
  assert.match(sql, /CREATE TABLE public\.source_1/);
  assert.match(sql, /CREATE TABLE raw\.orders/);
  assert.match(sql, /INSERT INTO public\.source_1/);
  assert.match(sql, /INSERT INTO raw\.orders/);
});

test('buildLocalWarehouseConnectionCatalog advertises the seeded local source tables', () => {
  const catalog = JSON.parse(buildLocalWarehouseConnectionCatalog());

  assert.equal(catalog.connections[0].id, 'local-postgres');
  assert.deepEqual(
    catalog.connections[0].tables.map((table) => `${table.schema}.${table.table}`),
    ['public.source_1', 'raw.orders']
  );
});

test('startLocalTemporalService uses a full local Temporal dev server instead of time skipping', async () => {
  let createLocalCalled = false;
  let createTimeSkippingCalled = false;
  let teardownCalled = false;

  const service = await startLocalTemporalService({
    TestWorkflowEnvironment: {
      createLocal: async () => {
        createLocalCalled = true;
        return {
          address: '127.0.0.1:12345',
          namespace: 'dev-namespace',
          teardown: async () => {
            teardownCalled = true;
          },
        };
      },
      createTimeSkipping: async () => {
        createTimeSkippingCalled = true;
        throw new Error('createTimeSkipping must not be used for dev stack');
      },
    },
  });

  assert.equal(createLocalCalled, true);
  assert.equal(createTimeSkippingCalled, false);
  assert.equal(service.address, '127.0.0.1:12345');
  assert.equal(service.namespace, 'dev-namespace');

  await service.close();

  assert.equal(teardownCalled, true);
});

test('waitForUrlOrProcessExit attaches the post-ready exit watcher before releasing readiness', async () => {
  const child = new EventEmitter();
  const server = http.createServer((_request, response) => {
    response.writeHead(200);
    response.end('ok');
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    assert.equal(typeof address, 'object');
    assert.notEqual(address, null);

    let observedExit = false;
    await waitForUrlOrProcessExit(
      `http://127.0.0.1:${address.port}/readyz`,
      (response) => response.statusCode === 200,
      1_000,
      10,
      'Temporal worker readyz',
      { child },
      () => {
        child.once('exit', () => {
          observedExit = true;
        });
        child.emit('exit', 1, null);
      }
    );

    assert.equal(observedExit, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
