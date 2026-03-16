import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../src/env.js';

await test('loadEnv throws when DATABASE_URL is missing', async () => {
  assert.throws(() => loadEnv({}), /DATABASE_URL/);
});

await test('loadEnv applies defaults for projector worker env vars', async () => {
  const env = loadEnv({ DATABASE_URL: 'postgres://localhost/dvt' });

  assert.equal(env.DVT_PROJECTOR_BATCH_SIZE, 50);
  assert.equal(env.DVT_PROJECTOR_POLL_INTERVAL_MS, 5000);
  assert.equal(env.DVT_PROJECTOR_ERROR_BACKOFF_MS, 10000);
  assert.equal(env.DVT_PROJECTOR_ADMIN_PORT, 9465);
  assert.equal(env.SERVICE_NAME, 'dvt-projector-worker');
});
