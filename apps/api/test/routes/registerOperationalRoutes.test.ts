import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import { READINESS_PROBE_STATUS } from '../../src/routes/healthReadinessPorts.js';
import { registerOperationalRoutes } from '../../src/routes/registerOperationalRoutes.js';
import { RECONCILER_HEALTH_STATUS } from '../../src/runtime/reconcilerHealth.js';
import { BASE_APP_ENV, mergeEnv, READYZ_ENABLED_ENV } from '../app/appEnvTestSupport.js';

describe('registerOperationalRoutes', () => {
  it('mounts public operational routes as one API component', async () => {
    const app = Fastify({ logger: false });
    const env = loadEnv(mergeEnv(BASE_APP_ENV, { DVT_VERSION_ENABLED: 'true' }));

    await registerOperationalRoutes(app, {
      env,
      getIntentReconcilerHealth: () => ({ status: RECONCILER_HEALTH_STATUS.disabled }),
      readinessPorts: {
        checkDatabaseReady: vi.fn(async () => READINESS_PROBE_STATUS.ready),
        checkRuntimeAdaptersReady: vi.fn(async () => READINESS_PROBE_STATUS.ready),
      },
    });

    const [health, capabilities, version, root] = await Promise.all([
      app.inject({ method: 'GET', url: '/healthz' }),
      app.inject({ method: 'GET', url: '/capabilities' }),
      app.inject({ method: 'GET', url: '/version' }),
      app.inject({ method: 'GET', url: '/' }),
    ]);

    expect(health.statusCode).toBe(200);
    expect(capabilities.statusCode).toBe(200);
    expect(version.json()).toEqual({ name: env.SERVICE_NAME, version: '0.1.0' });
    expect(root.json()).toEqual({ service: env.SERVICE_NAME, ok: true });
  });

  it('keeps readiness disabled unless the environment enables it', async () => {
    const app = Fastify({ logger: false });

    await registerOperationalRoutes(app, {
      env: loadEnv(BASE_APP_ENV),
      getIntentReconcilerHealth: () => ({ status: RECONCILER_HEALTH_STATUS.disabled }),
      readinessPorts: {
        checkDatabaseReady: vi.fn(async () => READINESS_PROBE_STATUS.ready),
        checkRuntimeAdaptersReady: vi.fn(async () => READINESS_PROBE_STATUS.ready),
      },
    });

    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.statusCode).toBe(404);
  });

  it('mounts readiness when the environment enables it', async () => {
    const app = Fastify({ logger: false });

    await registerOperationalRoutes(app, {
      env: loadEnv(mergeEnv(BASE_APP_ENV, READYZ_ENABLED_ENV)),
      getIntentReconcilerHealth: () => ({ status: RECONCILER_HEALTH_STATUS.disabled }),
      readinessPorts: {
        checkDatabaseReady: vi.fn(async () => READINESS_PROBE_STATUS.ready),
        checkRuntimeAdaptersReady: vi.fn(async () => READINESS_PROBE_STATUS.ready),
      },
    });

    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, status: 'ready' });
  });
});
