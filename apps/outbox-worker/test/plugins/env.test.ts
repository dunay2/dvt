import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../../src/plugins/env.js';

await test('loadEnv applies standalone worker defaults', () => {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
  });

  assert.equal(env.DVT_PG_SCHEMA, 'dvt');
  assert.equal(env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS, 1000);
  assert.equal(env.DVT_OUTBOX_WORKER_BATCH_SIZE, 100);
  assert.equal(env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS, 5000);
  assert.equal(env.DVT_OUTBOX_WORKER_STOP_ON_ERROR, false);
  assert.equal(env.DVT_OUTBOX_WORKER_RUN_MIGRATIONS, false);
  assert.equal(env.DVT_OUTBOX_EVENT_BUS_MODE, 'http');
  assert.equal(env.DVT_OUTBOX_HTTP_TARGET_URL, 'http://localhost:8080/outbox/events');
  assert.equal(env.DVT_OUTBOX_HTTP_TIMEOUT_MS, 10000);
  assert.equal(env.DVT_OUTBOX_ADMIN_HOST, '127.0.0.1');
  assert.equal(env.DVT_OUTBOX_ADMIN_PORT, 9464);
  assert.equal(env.SERVICE_NAME, 'dvt-outbox-worker');
});

await test('loadEnv fails fast when DATABASE_URL is missing', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
      }),
    /DATABASE_URL/
  );
});

await test('loadEnv fails fast when http mode is selected without target url', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      }),
    /DVT_OUTBOX_HTTP_TARGET_URL/
  );
});

await test('loadEnv allows log mode without target url', () => {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });

  assert.equal(env.DVT_OUTBOX_EVENT_BUS_MODE, 'log');
});

await test('loadEnv parses string booleans for stop-on-error explicitly', () => {
  const falseEnv = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'false',
  });
  const zeroEnv = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_STOP_ON_ERROR: '0',
  });
  const trueEnv = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'true',
  });
  const migrateEnv = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
  });

  assert.equal(falseEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR, false);
  assert.equal(zeroEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR, false);
  assert.equal(trueEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR, true);
  assert.equal(migrateEnv.DVT_OUTBOX_WORKER_RUN_MIGRATIONS, true);
});
