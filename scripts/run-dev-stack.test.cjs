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
  prepareTemporalWorkerRuntimeDependencies,
  buildLocalPostgresProofSeedSql,
  buildLocalWarehouseConnectionRequest,
  ensureLocalWarehouseConnectionViaApi,
  waitForUrlOrProcessExit,
} = require('./run-dev-stack.cjs');
const {
  resolveTemporalCliExecutable,
  startLocalTemporalService,
} = require('./run-dev-stack.temporal.cjs');
const { defaultPgUrl } = require('./run-local-postgres.cjs');

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
  assert.equal(apiEnv.DVT_LOCAL_POSTGRES_WAREHOUSE_URL, undefined);
  assert.equal(
    apiEnv.DVT_POSTGRES_CREDENTIAL_BINDINGS,
    JSON.stringify({ 'postgres:local-postgres-proof': defaultPgUrl })
  );
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
  assert.equal(apiEnv.DVT_LOCAL_POSTGRES_WAREHOUSE_URL, undefined);
  assert.equal(apiEnv.DVT_POSTGRES_CREDENTIAL_BINDINGS, undefined);
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
      DVT_TEMPORAL_DBT_ENABLED: 'true',
    }
  );

  assert.equal(apiEnv.TEMPORAL_ADDRESS, 'temporal.dev:7233');
  assert.equal(apiEnv.TEMPORAL_NAMESPACE, 'dev');
  assert.equal(apiEnv.TEMPORAL_TASK_QUEUE, 'dev-task-queue');
  assert.equal(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL, 'http://temporal-worker.dev/readyz');
  assert.equal(apiEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(apiEnv.DVT_DBT_BUNDLE_FILE_ROOT, 'C:\\custom\\dbt-bundles');
  assert.equal(apiEnv.DVT_WORKSPACE_FILES_ROOT, 'C:\\custom\\workspace-files');
  assert.equal(apiEnv.DVT_TEMPORAL_DBT_ENABLED, 'true');
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
  assert.equal(
    workerEnv.DVT_POSTGRES_CREDENTIAL_BINDINGS,
    JSON.stringify({ 'postgres:local-postgres-proof': defaultPgUrl })
  );
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
      DVT_WORKSPACE_FILES_ROOT: 'C:\\custom\\workspace-files',
    },
    defaultPgUrl
  );

  assert.equal(workerEnv.DVT_DBT_BUNDLE_STORE_BACKEND, 'file');
  assert.equal(workerEnv.DVT_DBT_BUNDLE_FILE_ROOT, 'C:\\custom\\dbt-bundles');
  assert.equal(workerEnv.DVT_WORKSPACE_FILES_ROOT, 'C:\\custom\\workspace-files');
});

test('buildCoordinatedTemporalWorkerEnv keeps DBT execution profile aligned with API env', () => {
  const apiEnv = buildApiEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    { DVT_TEMPORAL_DBT_ENABLED: 'true' }
  );

  const workerEnv = buildCoordinatedTemporalWorkerEnv(
    {
      host: '127.0.0.1',
      apiPort: 3000,
      skipPostgres: false,
    },
    apiEnv,
    { DVT_TEMPORAL_DBT_ENABLED: 'true' }
  );

  assert.equal(apiEnv.DVT_TEMPORAL_DBT_ENABLED, 'true');
  assert.equal(workerEnv.DVT_TEMPORAL_DBT_ENABLED, 'true');
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

test('prepareTemporalWorkerRuntimeDependencies invokes the canonical runtime-closure builder when the worker is required', () => {
  const calls = [];
  const protectedRuntimeEnv = {
    DATABASE_URL: defaultPgUrl,
    OIDC_JWKS_URI: 'http://127.0.0.1:4000/.well-known/jwks.json',
    OIDC_ISSUER: 'https://issuer.local.dvt/',
    OIDC_AUDIENCE: 'dvt-api',
  };

  const prepared = prepareTemporalWorkerRuntimeDependencies(protectedRuntimeEnv, {
    spawnCommand: (file, args, options) => {
      calls.push({ file, args, options });
      return { status: 0 };
    },
  });

  assert.equal(prepared, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].file, process.execPath);
  assert.match(
    calls[0].args[0].replace(/\\/g, '/'),
    /\/scripts\/build-workspace-runtime-deps\.cjs$/
  );
  assert.deepEqual(calls[0].args.slice(1), ['dvt-temporal-worker']);
  assert.equal(calls[0].options.stdio, 'inherit');
  assert.equal(calls[0].options.windowsHide, true);
});

test('prepareTemporalWorkerRuntimeDependencies skips the build when the worker is not required', () => {
  let spawned = false;

  const prepared = prepareTemporalWorkerRuntimeDependencies(
    {},
    {
      spawnCommand: () => {
        spawned = true;
        return { status: 0 };
      },
    }
  );

  assert.equal(prepared, false);
  assert.equal(spawned, false);
});

test('prepareTemporalWorkerRuntimeDependencies fails clearly when the runtime build fails', () => {
  const protectedRuntimeEnv = {
    DATABASE_URL: defaultPgUrl,
    OIDC_JWKS_URI: 'http://127.0.0.1:4000/.well-known/jwks.json',
    OIDC_ISSUER: 'https://issuer.local.dvt/',
    OIDC_AUDIENCE: 'dvt-api',
  };

  assert.throws(
    () =>
      prepareTemporalWorkerRuntimeDependencies(protectedRuntimeEnv, {
        spawnCommand: () => ({ status: 17 }),
      }),
    /Temporal worker runtime dependency build failed with exit code 17/
  );
});

test('buildLocalPostgresProofSeedSql creates real default source tables for Canvas runs', () => {
  const sql = buildLocalPostgresProofSeedSql();

  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS raw/);
  assert.match(sql, /CREATE TABLE public\.source_1/);
  assert.match(sql, /CREATE TABLE raw\.orders/);
  assert.match(sql, /INSERT INTO public\.source_1/);
  assert.match(sql, /INSERT INTO raw\.orders/);
  assert.match(sql, /ANALYZE public\.source_1/);
  assert.match(sql, /ANALYZE raw\.orders/);
});

test('buildLocalWarehouseConnectionRequest uses the protected connection command contract', () => {
  assert.deepEqual(buildLocalWarehouseConnectionRequest(), {
    name: 'Local Postgres proof',
    type: 'postgres',
    database: 'dvt',
    credentialRef: 'postgres:local-postgres-proof',
  });
});

test('ensureLocalWarehouseConnectionViaApi scopes and authenticates the real command rail', async () => {
  const received = {};
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => {
      received.url = request.url;
      received.authorization = request.headers.authorization;
      received.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      response.writeHead(201, { 'content-type': 'application/json' });
      response.end('{}');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const statusCode = await ensureLocalWarehouseConnectionViaApi({
      apiBaseUrl: `http://127.0.0.1:${address.port}`,
      bearerToken: 'proof-token',
      workspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
      },
    });

    assert.equal(statusCode, 201);
    assert.equal(received.authorization, 'Bearer proof-token');
    assert.match(
      received.url,
      /^\/workspace\/warehouse\/connections\?tenantId=tenant-a&projectId=project-a&environmentId=env-a$/
    );
    assert.deepEqual(received.body, buildLocalWarehouseConnectionRequest());
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test('ensureLocalWarehouseConnectionViaApi accepts only the canonical duplicate conflict', async () => {
  const server = http.createServer((_request, response) => {
    response.writeHead(409, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
      })
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const statusCode = await ensureLocalWarehouseConnectionViaApi({
      apiBaseUrl: `http://127.0.0.1:${address.port}`,
      bearerToken: 'proof-token',
      workspaceScope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
      },
    });

    assert.equal(statusCode, 409);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test('ensureLocalWarehouseConnectionViaApi honors the caller command timeout', async () => {
  const server = http.createServer((_request, response) => {
    setTimeout(() => {
      response.writeHead(201, { 'content-type': 'application/json' });
      response.end('{}');
    }, 100);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    await assert.rejects(
      ensureLocalWarehouseConnectionViaApi({
        apiBaseUrl: `http://127.0.0.1:${address.port}`,
        bearerToken: 'proof-token',
        workspaceScope: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'env-a',
        },
        commandTimeoutMs: 5,
      }),
      /Timeout while sending command/
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test('ensureLocalWarehouseConnectionViaApi rejects unrelated conflicts', async () => {
  const server = http.createServer((_request, response) => {
    response.writeHead(409, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: { type: 'conflict', reason: 'revision_conflict' } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    await assert.rejects(
      ensureLocalWarehouseConnectionViaApi({
        apiBaseUrl: `http://127.0.0.1:${address.port}`,
        bearerToken: 'proof-token',
        workspaceScope: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'env-a',
        },
      }),
      /Local warehouse connection command failed with 409/
    );
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test('resolveTemporalCliExecutable prefers an explicit operator-provided CLI path', () => {
  const executable = resolveTemporalCliExecutable(
    { DVT_TEMPORAL_CLI_PATH: 'C:\\Temporal\\temporal.exe' },
    {
      readdirSync: () => {
        throw new Error('cache lookup must not run when the CLI path is explicit');
      },
    },
    'C:\\Temp'
  );

  assert.equal(executable, 'C:\\Temporal\\temporal.exe');
});

test('resolveTemporalCliExecutable leaves a clean SDK cache to SDK cached-download bootstrap', () => {
  const executable = resolveTemporalCliExecutable(
    {},
    {
      readFileSync: () => JSON.stringify({ version: '1.16.1' }),
      readdirSync: () => [],
    },
    'C:\\Temp'
  );

  assert.equal(executable, undefined);
});

test('resolveTemporalCliExecutable uses adapter-declared testing version over stale install', () => {
  const executableSuffix = process.platform === 'win32' ? '.exe' : '';
  const tmpDir = process.platform === 'win32' ? 'C:\\Temp' : '/tmp';
  const executable = resolveTemporalCliExecutable(
    {},
    {
      readFileSync: (filePath) => {
        const normalizedPath = filePath.replace(/\\/g, '/');
        if (normalizedPath.endsWith('packages/@dvt/adapter-temporal/package.json')) {
          return JSON.stringify({
            devDependencies: {
              '@temporalio/testing': '1.17.2',
            },
          });
        }
        if (normalizedPath.includes('@temporalio/testing/package.json')) {
          return JSON.stringify({ version: '1.16.1' });
        }
        throw new Error(`Unexpected package manifest read: ${filePath}`);
      },
      readdirSync: () => [
        `temporal-sdk-typescript-1.16.1${executableSuffix}`,
        `temporal-sdk-typescript-1.17.2${executableSuffix}`,
      ],
      statSync: (filePath) => ({
        isFile: () => true,
        mtimeMs: filePath.includes('1.16.1') ? 20 : 10,
      }),
    },
    tmpDir
  );

  assert.equal(
    executable.replace(/\\/g, '/'),
    `${tmpDir.replace(/\\/g, '/')}/temporal-sdk-typescript-1.17.2${executableSuffix}`
  );
});

test('startLocalTemporalService delegates clean-cache bootstrap to SDK cached-download', async () => {
  let sdkStartCall;
  let closed = false;
  const service = await startLocalTemporalService({
    env: {},
    fsModule: {
      readFileSync: () => JSON.stringify({ version: '1.16.1' }),
      readdirSync: () => [],
    },
    host: '127.0.0.1',
    namespace: 'default',
    port: 7292,
    spawnProcess: () => {
      throw new Error('clean-cache bootstrap must not spawn PATH temporal');
    },
    startTemporalSdkDevServer: async (options) => {
      sdkStartCall = options;
      return {
        address: `${options.host}:${options.port}`,
        namespace: options.namespace,
        close: async () => {
          closed = true;
        },
      };
    },
  });

  assert.deepEqual(sdkStartCall, {
    host: '127.0.0.1',
    namespace: 'default',
    port: 7292,
  });
  assert.equal(service.address, '127.0.0.1:7292');
  assert.equal(service.namespace, 'default');

  await service.close();

  assert.equal(closed, true);
});

test('startLocalTemporalService starts an explicit owned Temporal CLI dev server', async () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 12345;
  child.killed = false;
  child.exitCode = null;

  let spawnCall;
  let terminated = false;

  const service = await startLocalTemporalService({
    executablePath: 'temporal',
    host: '127.0.0.1',
    namespace: 'default',
    port: 7291,
    spawnProcess: (file, args, options) => {
      spawnCall = { file, args, options };
      return child;
    },
    waitForTcpPort: async ({ child: observedChild, host, port }) => {
      assert.equal(observedChild, child);
      assert.equal(host, '127.0.0.1');
      assert.equal(port, 7291);
    },
    terminateProcessTree: async (observedChild) => {
      assert.equal(observedChild, child);
      terminated = true;
      child.killed = true;
    },
  });

  assert.equal(spawnCall.file, 'temporal');
  assert.deepEqual(spawnCall.args.slice(0, 7), [
    'server',
    'start-dev',
    '--ip',
    '127.0.0.1',
    '--port',
    '7291',
    '--namespace',
  ]);
  assert.ok(spawnCall.args.includes('--headless'));
  assert.ok(spawnCall.args.includes('--disable-config-file'));
  assert.ok(spawnCall.args.includes('--disable-config-env'));
  assert.equal(spawnCall.options.windowsHide, true);
  assert.equal(service.address, '127.0.0.1:7291');
  assert.equal(service.namespace, 'default');

  await service.close();

  assert.equal(terminated, true);
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
