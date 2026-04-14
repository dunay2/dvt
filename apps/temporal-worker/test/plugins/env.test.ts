import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';

describe('temporal worker env', () => {
  it('loads required env with sensible defaults', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_TASK_QUEUE: 'dvt-temporal',
    });

    expect(env.SERVICE_NAME).toBe('dvt-temporal-worker');
    expect(env.DVT_TEMPORAL_DBT_ENABLED).toBe(false);
    expect(env.DVT_TEMPORAL_WORKER_RUN_MIGRATIONS).toBe(false);
    expect(env.DVT_DBT_BIN).toBe('dbt');
  });

  it('requires DATABASE_URL', () => {
    expect(() =>
      loadEnv({
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-temporal',
      })
    ).toThrow(/DATABASE_URL/);
  });

  it('requires explicit Temporal routing env', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      })
    ).toThrow(/TEMPORAL_ADDRESS/);
  });
});
