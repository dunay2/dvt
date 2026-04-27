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
    expect(env.DVT_RUNSTATE_CIRCUIT_BREAKER_FAILURE_THRESHOLD).toBe(3);
    expect(env.DVT_RUNSTATE_CIRCUIT_BREAKER_OPEN_DURATION_MS).toBe(10000);
    expect(env.DVT_RUNSTATE_CIRCUIT_BREAKER_OPERATION_TIMEOUT_MS).toBe(2000);
  });

  it('requires bundle store config when DBT mode is enabled', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-temporal',
        DVT_TEMPORAL_DBT_ENABLED: 'true',
      })
    ).toThrow(/DVT_DBT_BUNDLE_STORE_BACKEND/);
  });

  it('requires bundle bucket when DBT S3 store mode is enabled', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-temporal',
        DVT_TEMPORAL_DBT_ENABLED: 'true',
        DVT_DBT_BUNDLE_STORE_BACKEND: 's3',
      })
    ).toThrow(/DVT_DBT_BUNDLE_S3_BUCKET/);
  });

  it('requires bundle file root when DBT file store mode is enabled', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
        TEMPORAL_ADDRESS: 'temporal:7233',
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-temporal',
        DVT_TEMPORAL_DBT_ENABLED: 'true',
        DVT_DBT_BUNDLE_STORE_BACKEND: 'file',
      })
    ).toThrow(/DVT_DBT_BUNDLE_FILE_ROOT/);
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

  it('accepts the Temporal continue-as-new payload budget env', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'default',
      TEMPORAL_TASK_QUEUE: 'dvt-temporal',
      TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: '64000',
    });

    expect((env as Record<string, unknown>).TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES).toBe(
      '64000'
    );
  });
});
