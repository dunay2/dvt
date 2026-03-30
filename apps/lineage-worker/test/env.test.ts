import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/env.js';

function baseEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_PG_SCHEMA: 'dvt',
    DVT_PG_STATEMENT_TIMEOUT_MS: '0',
    DVT_PG_QUERY_TIMEOUT_MS: '0',
    DVT_COMPILED_CODE_RESOLVER_BACKEND: 'auto',
    DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE: 'false',
    DVT_LINEAGE_API_URL: 'https://lineage.example/api',
    DVT_LINEAGE_NAMESPACE: 'dvt',
    DVT_LINEAGE_BATCH_SIZE: '50',
    DVT_LINEAGE_POLL_INTERVAL_MS: '5000',
    DVT_LINEAGE_ERROR_BACKOFF_MS: '10000',
    DVT_LINEAGE_ADMIN_HOST: '127.0.0.1',
    DVT_LINEAGE_ADMIN_PORT: '9466',
    SERVICE_NAME: 'dvt-lineage-worker',
  };
}

describe('loadEnv', () => {
  it('accepts a trimmed DLQ alert tenant id', () => {
    const env = loadEnv({
      ...baseEnv(),
      DVT_LINEAGE_DLQ_ALERT_TENANT_ID: '  tenant-a  ',
    });

    expect(env.DVT_LINEAGE_DLQ_ALERT_TENANT_ID).toBe('tenant-a');
  });

  it('rejects a whitespace-only DLQ alert tenant id', () => {
    expect(() =>
      loadEnv({
        ...baseEnv(),
        DVT_LINEAGE_DLQ_ALERT_TENANT_ID: '   ',
      })
    ).toThrow('Invalid environment');
  });
});
