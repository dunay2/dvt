import assert from 'node:assert/strict';
import test from 'node:test';

import type { FastifyInstance } from 'fastify';

import { buildProtectedRuntimeModule } from '../src/modules/buildProtectedRuntimeModule.js';
import { buildProviderAdapters } from '../src/modules/buildProviderAdapters.js';
import { registerOperationalHooks } from '../src/modules/registerOperationalHooks.js';

await test('buildProtectedRuntimeModule fails fast without DATABASE_URL', async () => {
  const fakeApp = { log: { info() {}, warn() {}, error() {} } } as unknown as FastifyInstance;

  await assert.rejects(
    () => buildProtectedRuntimeModule(fakeApp, {} as never, {} as never),
    /DATABASE_URL is required when OIDC-protected runtime routes are enabled/
  );
});

await test('registerOperationalHooks wires migrate and close hooks', async () => {
  const hooks = new Map<string, () => Promise<void>>();
  let migrateCalls = 0;
  let closeCalls = 0;

  const fakeApp = {
    addHook(name: string, hook: () => Promise<void>) {
      hooks.set(name, hook);
    },
  } as unknown as FastifyInstance;

  registerOperationalHooks(fakeApp, {
    facade: {} as never,
    adapters: new Map(),
    stateStore: {} as never,
    async migrate() {
      migrateCalls += 1;
    },
    async close() {
      closeCalls += 1;
    },
  });

  await hooks.get('onReady')?.();
  await hooks.get('onClose')?.();

  assert.equal(migrateCalls, 1);
  assert.equal(closeCalls, 1);
});

await test('buildProviderAdapters always registers the mock adapter', async () => {
  const result = await buildProviderAdapters(
    {
      NODE_ENV: 'test',
      PORT: 3000,
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
      CORS_ORIGIN: '*',
      DVT_PG_SCHEMA: 'dvt',
      DVT_PG_STATEMENT_TIMEOUT_MS: 0,
      DVT_PG_QUERY_TIMEOUT_MS: 0,
      DVT_OUTBOX_SHARD_COUNT: 1,
      DVT_INTENT_RECONCILER_ENABLED: false,
      DVT_INTENT_RECONCILER_INTERVAL_MS: 30000,
      DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS: 300000,
      DVT_INTENT_RECONCILER_LIMIT: 50,
      DVT_INTENT_RECONCILER_BACKOFF_BASE_MS: 1000,
      DVT_INTENT_RECONCILER_BACKOFF_MAX_MS: 60000,
      DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS: 20000,
      DVT_INTENT_RECONCILER_PROVIDERS: 'mock',
      SERVICE_NAME: 'dbf-api',
      OBS_ENABLED: false,
      OIDC_ALGORITHMS: 'RS256',
      DVT_READYZ_ENABLED: false,
      DVT_VERSION_ENABLED: false,
      DVT_DB_READY_ENABLED: false,
      DVT_ADMIN_ROUTES_ENABLED: false,
    } as never,
    {
      stateStore: {
        async listEvents() {
          return [];
        },
      },
      projector: {
        rebuild() {
          return {};
        },
      },
      observability: { logs: { info() {}, warn() {}, error() {}, debug() {} } } as never,
    }
  );

  assert.equal(result.adapters.size, 1);
  assert.ok(result.adapters.has('mock'));

  await assert.doesNotReject(async () => {
    await result.close();
  });
});
