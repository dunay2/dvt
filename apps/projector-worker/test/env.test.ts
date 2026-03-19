import { describe, it, expect } from 'vitest';

import { loadEnv } from '../src/env.js';

describe('loadEnv', () => {
  it('throws when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('applies defaults for projector worker env vars', () => {
    const env = loadEnv({ DATABASE_URL: 'postgres://localhost/dvt' });

    expect(env.DVT_PROJECTOR_BATCH_SIZE).toBe(50);
    expect(env.DVT_PROJECTOR_POLL_INTERVAL_MS).toBe(5000);
    expect(env.DVT_PROJECTOR_ERROR_BACKOFF_MS).toBe(10000);
    expect(env.DVT_PROJECTOR_ADMIN_PORT).toBe(9465);
    expect(env.SERVICE_NAME).toBe('dvt-projector-worker');
  });
});
