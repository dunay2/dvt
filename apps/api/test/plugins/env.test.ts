import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../../src/plugins/env.js';

await test('loadEnv parses strict boolean strings for operational flags', async () => {
  const env = loadEnv({
    OBS_ENABLED: '0',
    DVT_INTENT_RECONCILER_ENABLED: 'false',
    DVT_READYZ_ENABLED: 'false',
    DVT_VERSION_ENABLED: '0',
    DVT_DB_READY_ENABLED: 'false',
    DVT_ADMIN_ROUTES_ENABLED: '0',
  });

  assert.equal(env.OBS_ENABLED, false);
  assert.equal(env.DVT_INTENT_RECONCILER_ENABLED, false);
  assert.equal(env.DVT_READYZ_ENABLED, false);
  assert.equal(env.DVT_VERSION_ENABLED, false);
  assert.equal(env.DVT_DB_READY_ENABLED, false);
  assert.equal(env.DVT_ADMIN_ROUTES_ENABLED, false);
});

await test('loadEnv accepts true and 1 for boolean flags', async () => {
  const env = loadEnv({
    OBS_ENABLED: 'true',
    DVT_INTENT_RECONCILER_ENABLED: '1',
    DVT_READYZ_ENABLED: 'true',
    DVT_VERSION_ENABLED: '1',
    DVT_DB_READY_ENABLED: 'true',
    DVT_ADMIN_ROUTES_ENABLED: '1',
  });

  assert.equal(env.OBS_ENABLED, true);
  assert.equal(env.DVT_INTENT_RECONCILER_ENABLED, true);
  assert.equal(env.DVT_READYZ_ENABLED, true);
  assert.equal(env.DVT_VERSION_ENABLED, true);
  assert.equal(env.DVT_DB_READY_ENABLED, true);
  assert.equal(env.DVT_ADMIN_ROUTES_ENABLED, true);
});

await test('loadEnv rejects ambiguous boolean strings', async () => {
  assert.throws(
    () =>
      loadEnv({
        DVT_ADMIN_ROUTES_ENABLED: 'yes',
      }),
    /DVT_ADMIN_ROUTES_ENABLED/
  );
});
