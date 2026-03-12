import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv, isActiveEnv, type ActiveEnv } from '../../src/plugins/env.js';
import { resolveReadyStaleAfterMs } from '../../src/ops/resolveReadyStaleAfterMs.js';

function loadActiveTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): ActiveEnv {
  const env = loadEnv({
    NODE_ENV: 'test',
    DVT_OUTBOX_OWNERSHIP_MODE: 'active',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/dvt',
    DVT_OUTBOX_EVENT_BUS_MODE: 'http',
    DVT_OUTBOX_HTTP_TARGET_URL: 'http://example.test/outbox/events',
    ...overrides,
  });
  assert.equal(isActiveEnv(env), true);
  return env;
}

await test('resolveReadyStaleAfterMs covers the full in-flight HTTP batch budget', () => {
  const env = loadActiveTestEnv();

  assert.equal(resolveReadyStaleAfterMs(env), 1_005_000);
});

await test('resolveReadyStaleAfterMs falls back to the steady-state budget for log mode', () => {
  const env = loadActiveTestEnv({
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
  });

  assert.equal(resolveReadyStaleAfterMs(env), 15_000);
});

await test('resolveReadyStaleAfterMs respects the largest per-record timeout budget', () => {
  const env = loadActiveTestEnv({
    DVT_OUTBOX_EVENT_BUS_MODE: 'log',
    DVT_OUTBOX_WORKER_BATCH_SIZE: '2',
    DVT_PG_QUERY_TIMEOUT_MS: '20000',
  });

  assert.equal(resolveReadyStaleAfterMs(env), 45_000);
});
