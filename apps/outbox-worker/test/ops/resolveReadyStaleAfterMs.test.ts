import { describe, it, expect } from 'vitest';

import { resolveReadyStaleAfterMs } from '../../src/ops/resolveReadyStaleAfterMs.js';
import { loadEnv, isActiveEnv, type ActiveEnv } from '../../src/plugins/env.js';

function loadActiveTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): ActiveEnv {
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'http',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://example.test/outbox/events',
    ...overrides,
  });
  if (!isActiveEnv(env)) {
    throw new Error('expected an active outbox worker environment');
  }
  return env;
}

describe('resolveReadyStaleAfterMs', () => {
  it('covers the full in-flight HTTP batch budget', () => {
    const env = loadActiveTestEnv();

    expect(resolveReadyStaleAfterMs(env)).toBe(1_005_000);
  });

  it('falls back to the steady-state budget for log mode', () => {
    const env = loadActiveTestEnv({
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
    });

    expect(resolveReadyStaleAfterMs(env)).toBe(15_000);
  });

  it('respects the largest per-record timeout budget', () => {
    const env = loadActiveTestEnv({
      DVT_OUTBOX_EVENT_BUS_MODE: 'log',
      DVT_OUTBOX_WORKER_BATCH_SIZE: '2',
      DVT_PG_QUERY_TIMEOUT_MS: '20000',
    });

    expect(resolveReadyStaleAfterMs(env)).toBe(45_000);
  });
});
