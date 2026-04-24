const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const http = require('node:http');

const {
  parseArgs,
  resolveDatabaseUrl,
  shouldBootstrapLocalPostgres,
  buildApiEnv,
  buildTemporalWorkerEnv,
  shouldStartTemporalWorker,
  waitForUrlOrProcessExit,
} = require('./run-dev-stack.cjs');
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
    }
  );

  assert.equal(apiEnv.TEMPORAL_ADDRESS, 'temporal.dev:7233');
  assert.equal(apiEnv.TEMPORAL_NAMESPACE, 'dev');
  assert.equal(apiEnv.TEMPORAL_TASK_QUEUE, 'dev-task-queue');
  assert.equal(apiEnv.DVT_TEMPORAL_WORKER_READYZ_URL, 'http://temporal-worker.dev/readyz');
});

test('buildTemporalWorkerEnv injects canonical local temporal worker posture', () => {
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
  assert.equal(workerEnv.TEMPORAL_TASK_QUEUE, 'dvt-temporal');
  assert.equal(workerEnv.DVT_TEMPORAL_ADMIN_HOST, '127.0.0.1');
  assert.equal(workerEnv.DVT_TEMPORAL_ADMIN_PORT, '9468');
  assert.equal(workerEnv.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS, 'true');
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
