import assert from 'node:assert/strict';
import test from 'node:test';

import { isActiveEnv, loadEnv, type ActiveEnv, type Env } from '../../src/plugins/env.js';

function assertActiveEnv(env: Env): asserts env is ActiveEnv {
  if (!isActiveEnv(env)) {
    assert.fail('expected an active outbox worker environment');
  }
}

await test('loadEnv applies active worker defaults when ownership mode is explicit', () => {
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
  });

  assertActiveEnv(env);
  assert.equal(env.DVT_PG_SCHEMA, 'dvt');
  assert.equal(env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS, 1000);
  assert.equal(env.DVT_OUTBOX_WORKER_BATCH_SIZE, 100);
  assert.equal(env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS, 5000);
  assert.equal(env.DVT_OUTBOX_WORKER_STOP_ON_ERROR, false);
  assert.equal(env.DVT_OUTBOX_WORKER_RUN_MIGRATIONS, false);
  assert.equal(env.DVT_OUTBOX_OWNERSHIP_MODE, 'active');
  assert.equal(env.DVT_OUTBOX_EVENT_BUS_MODE, 'http');
  assert.equal(env.DVT_OUTBOX_HTTP_TARGET_URL, 'http://localhost:8080/outbox/events');
  assert.equal(env.DVT_OUTBOX_HTTP_TIMEOUT_MS, 10000);
  assert.equal(env.DVT_OUTBOX_ADMIN_HOST, '0.0.0.0');
  assert.equal(env.DVT_OUTBOX_ADMIN_PORT, 9464);
  assert.equal(env.SERVICE_NAME, 'dvt-outbox-worker');
});

await test('loadEnv applies passive worker defaults without runtime dependencies', () => {
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
  });

  assert.equal(env.DVT_OUTBOX_OWNERSHIP_MODE, 'passive');
  assert.equal(env.DVT_OUTBOX_ADMIN_HOST, '0.0.0.0');
  assert.equal(env.DVT_OUTBOX_ADMIN_PORT, 9464);
  assert.equal(env.SERVICE_NAME, 'dvt-outbox-worker');
});

await test('loadEnv fails fast when ownership mode is missing', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
      }),
    /DVT_OUTBOX_OWNERSHIP_MODE/
  );
});

await test('loadEnv fails fast when active mode is missing DATABASE_URL', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
      }),
    /DATABASE_URL/
  );
});

await test('loadEnv fails fast when active http mode is selected without target url', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      }),
    /DVT_OUTBOX_HTTP_TARGET_URL/
  );
});

await test('loadEnv allows active log mode without target url', () => {
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });

  assertActiveEnv(env);
  assert.equal(env.DVT_OUTBOX_EVENT_BUS_MODE, 'log');
});

await test('loadEnv parses string booleans for stop-on-error explicitly', () => {
  const falseEnv = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'false',
  });
  const zeroEnv = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_STOP_ON_ERROR: '0',
  });
  const trueEnv = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'true',
  });
  const migrateEnv = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
    DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'true',
  });

  assertActiveEnv(falseEnv);
  assertActiveEnv(zeroEnv);
  assertActiveEnv(trueEnv);
  assertActiveEnv(migrateEnv);
  assert.equal(falseEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR, false);
  assert.equal(zeroEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR, false);
  assert.equal(trueEnv.DVT_OUTBOX_WORKER_STOP_ON_ERROR, true);
  assert.equal(migrateEnv.DVT_OUTBOX_WORKER_RUN_MIGRATIONS, true);
});

await test('loadEnv accepts explicit ownership modes for canary control', () => {
  const activeEnv = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
  });
  const passiveEnv = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'passive',
  });

  assertActiveEnv(activeEnv);
  assert.equal(isActiveEnv(passiveEnv), false);
  assert.equal(activeEnv.DVT_OUTBOX_OWNERSHIP_MODE, 'active');
  assert.equal(passiveEnv.DVT_OUTBOX_OWNERSHIP_MODE, 'passive');
});

await test('loadEnv rejects ambiguous boolean strings for worker flags', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_STOP_ON_ERROR: 'yes',
      }),
    /DVT_OUTBOX_WORKER_STOP_ON_ERROR/
  );

  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_RUN_MIGRATIONS: 'enabled',
      }),
    /DVT_OUTBOX_WORKER_RUN_MIGRATIONS/
  );

  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_OWNERSHIP_MODE: 'leader',
      }),
    /DVT_OUTBOX_OWNERSHIP_MODE/
  );
});

await test('loadEnv rejects invalid worker timing and admin port values', () => {
  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: '0',
      }),
    /DVT_OUTBOX_WORKER_POLL_INTERVAL_MS/
  );

  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_BATCH_SIZE: '-1',
      }),
    /DVT_OUTBOX_WORKER_BATCH_SIZE/
  );

  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: '0',
      }),
    /DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS/
  );

  assert.throws(
    () =>
      loadEnv({
        NODE_ENV: 'test',
        DVT_OUTBOX_OWNERSHIP_MODE: 'active',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        DVT_OUTBOX_HTTP_TARGET_URL: 'http://localhost:8080/outbox/events',
        DVT_OUTBOX_ADMIN_PORT: '70000',
      }),
    /DVT_OUTBOX_ADMIN_PORT/
  );
});
