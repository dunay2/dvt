import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';

const BASE_ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/dvt',
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'default',
  TEMPORAL_TASK_QUEUE: 'dvt-temporal',
} as const;

describe('temporal worker Python environment', () => {
  it('keeps the profile disabled and unacknowledged by default', () => {
    const env = loadEnv(BASE_ENV);

    expect(env.DVT_TEMPORAL_PYTHON_ENABLED).toBe(false);
    expect(env.DVT_PYTHON_ISOLATED_WORKER_ACKNOWLEDGED).toBe(false);
    expect(env.DVT_PYTHON_RUNTIMES).toBeUndefined();
  });

  it('requires an explicit isolated-worker acknowledgement before enabling code execution', () => {
    expect(() =>
      loadEnv({
        ...BASE_ENV,
        DVT_TEMPORAL_PYTHON_ENABLED: 'true',
        DVT_PYTHON_RUNTIMES: JSON.stringify({
          'python-runtime:cpython-test': resolve('python-test-bin'),
        }),
      })
    ).toThrow(/DVT_PYTHON_ISOLATED_WORKER_ACKNOWLEDGED/);
  });

  it('requires a non-empty allowlist of opaque refs to absolute executables', () => {
    const enabled = {
      ...BASE_ENV,
      DVT_TEMPORAL_PYTHON_ENABLED: 'true',
      DVT_PYTHON_ISOLATED_WORKER_ACKNOWLEDGED: 'true',
    };

    expect(() => loadEnv(enabled)).toThrow(/DVT_PYTHON_RUNTIMES/);
    expect(() =>
      loadEnv({ ...enabled, DVT_PYTHON_RUNTIMES: JSON.stringify({}) })
    ).toThrow(/must not be empty/);
    expect(() =>
      loadEnv({
        ...enabled,
        DVT_PYTHON_RUNTIMES: JSON.stringify({ 'python-runtime:cpython-test': 'python3' }),
      })
    ).toThrow(/absolute executable paths/);
    expect(() =>
      loadEnv({
        ...enabled,
        DVT_PYTHON_RUNTIMES: JSON.stringify({
          'raw-path': resolve('python-test-bin'),
        }),
      })
    ).toThrow(/python-runtime/);
  });

  it('accepts one explicit governed runtime binding', () => {
    const executable = resolve('python-test-bin');
    const env = loadEnv({
      ...BASE_ENV,
      DVT_TEMPORAL_PYTHON_ENABLED: 'true',
      DVT_PYTHON_ISOLATED_WORKER_ACKNOWLEDGED: 'true',
      DVT_PYTHON_RUNTIMES: JSON.stringify({
        'python-runtime:cpython-test': executable,
      }),
    });

    expect(env.DVT_TEMPORAL_PYTHON_ENABLED).toBe(true);
    expect(JSON.parse(env.DVT_PYTHON_RUNTIMES ?? '{}')).toEqual({
      'python-runtime:cpython-test': executable,
    });
  });
});
