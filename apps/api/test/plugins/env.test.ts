import { describe, it, expect } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';

describe('loadEnv', () => {
  it('enables admin routes only for explicit true', async () => {
    const disabledValues = ['false', '0', 'junk', ' yes '];

    for (const value of disabledValues) {
      const env = loadEnv({ DVT_ADMIN_ROUTES_ENABLED: value });
      expect(env.DVT_ADMIN_ROUTES_ENABLED).toBe(false);
    }

    expect(loadEnv({ DVT_ADMIN_ROUTES_ENABLED: 'true' }).DVT_ADMIN_ROUTES_ENABLED).toBe(true);
  });

  it('applies strict parsing consistently across boolean flags', async () => {
    expect(loadEnv({ OBS_ENABLED: 'true' }).OBS_ENABLED).toBe(true);
    expect(loadEnv({ OBS_ENABLED: 'false' }).OBS_ENABLED).toBe(false);
    expect(loadEnv({ DVT_VERSION_ENABLED: 'junk' }).DVT_VERSION_ENABLED).toBe(false);
    expect(loadEnv({}).DVT_DB_READY_ENABLED).toBe(false);
  });
});
