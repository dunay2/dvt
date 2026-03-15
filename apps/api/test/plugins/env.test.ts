import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../../src/plugins/env.js';

await test('loadEnv enables admin routes only for explicit true', async () => {
  const disabledValues = ['false', '0', 'junk', ' yes '];

  for (const value of disabledValues) {
    const env = loadEnv({ DVT_ADMIN_ROUTES_ENABLED: value });
    assert.equal(env.DVT_ADMIN_ROUTES_ENABLED, false);
  }

  assert.equal(loadEnv({ DVT_ADMIN_ROUTES_ENABLED: 'true' }).DVT_ADMIN_ROUTES_ENABLED, true);
});

await test('loadEnv applies strict parsing consistently across boolean flags', async () => {
  assert.equal(loadEnv({ OBS_ENABLED: 'true' }).OBS_ENABLED, true);
  assert.equal(loadEnv({ OBS_ENABLED: 'false' }).OBS_ENABLED, false);
  assert.equal(loadEnv({ DVT_VERSION_ENABLED: 'junk' }).DVT_VERSION_ENABLED, false);
  assert.equal(loadEnv({}).DVT_DB_READY_ENABLED, false);
});
