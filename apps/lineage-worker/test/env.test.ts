import { describe, expect, it } from 'vitest';

import { loadEnv } from '../src/env.js';

function baseEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
    DVT_LINEAGE_API_URL: 'https://lineage.example/api',
  };
}

describe('lineage worker env boolean parsing', () => {
  it('parses explicit false string as false', () => {
    const env = loadEnv({
      ...baseEnv(),
      DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE: 'false',
    });

    expect(env.DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE).toBe(false);
  });

  it('parses explicit true string as true', () => {
    const env = loadEnv({
      ...baseEnv(),
      DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE: 'true',
    });

    expect(env.DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('rejects invalid boolean strings', () => {
    expect(() =>
      loadEnv({
        ...baseEnv(),
        DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE: 'not-a-bool',
      })
    ).toThrow(/DVT_COMPILED_CODE_RESOLVER_S3_FORCE_PATH_STYLE/i);
  });
});
