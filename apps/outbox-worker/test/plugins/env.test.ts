import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../../src/plugins/env.js';

await test('loadEnv applies standalone worker defaults', () => {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
  });

  assert.equal(env.DVT_PG_SCHEMA, 'dvt');
  assert.equal(env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS, 1000);
  assert.equal(env.DVT_OUTBOX_WORKER_BATCH_SIZE, 100);
  assert.equal(env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS, 5000);
  assert.equal(env.DVT_OUTBOX_WORKER_STOP_ON_ERROR, false);
  assert.equal(env.DVT_OUTBOX_EVENT_BUS_MODE, 'log');
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
