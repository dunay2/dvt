import process from 'node:process';

import { describe, it, expect } from 'vitest';

import { buildApp } from '../src/app.js';
import { PostgresPrincipalAccessRepository } from '../src/infrastructure/auth/postgresPrincipalAccessRepository.js';

const adapterPostgres = await import('@dvt/adapter-postgres');
const { PostgresPlanStore, PostgresStartRunIntentStore, PostgresStateStoreAdapter } =
  adapterPostgres;

describe('buildApp', () => {
  it('wires observability and health endpoint works', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';

    const { app, ctx } = await buildApp();
    expect(ctx.observability).toBeTruthy();

    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      ok: true,
      status: 'healthy',
      components: {
        intentReconciler: {
          status: 'disabled',
        },
      },
    });

    await app.close();
  });

  it('surfaces degraded intent reconciler state in health response', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.DVT_INTENT_RECONCILER_ENABLED = 'true';

    try {
      const { app, ctx } = await buildApp();
      ctx.setIntentReconcilerHealth({
        status: 'degraded',
        reasonCode: 'bootstrap_failed',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });
      const payload = res.json();
      expect(res.statusCode).toBe(200);
      expect(payload).toEqual({
        ok: true,
        status: 'degraded',
        components: {
          intentReconciler: {
            status: 'degraded',
            reasonCode: 'bootstrap_failed',
          },
        },
      });
      expect(payload.components.intentReconciler).not.toHaveProperty('reason');

      await app.close();
    } finally {
      delete process.env.DATABASE_URL;
      delete process.env.DVT_INTENT_RECONCILER_ENABLED;
    }
  });

  it('surfaces runtime_unavailable reason code for degraded reconciler state', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.DVT_INTENT_RECONCILER_ENABLED = 'true';

    try {
      const { app, ctx } = await buildApp();
      ctx.setIntentReconcilerHealth({
        status: 'degraded',
        reasonCode: 'runtime_unavailable',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });
      const payload = res.json();
      expect(res.statusCode).toBe(200);
      expect(payload).toEqual({
        ok: true,
        status: 'degraded',
        components: {
          intentReconciler: {
            status: 'degraded',
            reasonCode: 'runtime_unavailable',
          },
        },
      });
      expect(payload.components.intentReconciler).not.toHaveProperty('reason');

      await app.close();
    } finally {
      delete process.env.DATABASE_URL;
      delete process.env.DVT_INTENT_RECONCILER_ENABLED;
    }
  });

  it('reports starting reconciler status without exposing reason details', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.DVT_INTENT_RECONCILER_ENABLED = 'true';

    try {
      const { app } = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });
      const payload = res.json();

      expect(res.statusCode).toBe(200);
      expect(payload).toEqual({
        ok: true,
        status: 'healthy',
        components: {
          intentReconciler: {
            status: 'starting',
          },
        },
      });
      expect(payload.components.intentReconciler).not.toHaveProperty('reasonCode');
      expect(payload.components.intentReconciler).not.toHaveProperty('reason');

      await app.close();
    } finally {
      delete process.env.DATABASE_URL;
      delete process.env.DVT_INTENT_RECONCILER_ENABLED;
    }
  });

  it('defaults degraded reconciler reasonCode when not explicitly provided', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.DVT_INTENT_RECONCILER_ENABLED = 'true';

    try {
      const { app, ctx } = await buildApp();
      ctx.setIntentReconcilerHealth({
        status: 'degraded',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });
      const payload = res.json();

      expect(res.statusCode).toBe(200);
      expect(payload).toEqual({
        ok: true,
        status: 'degraded',
        components: {
          intentReconciler: {
            status: 'degraded',
            reasonCode: 'runtime_unavailable',
          },
        },
      });
      expect(payload.components.intentReconciler).not.toHaveProperty('reason');

      await app.close();
    } finally {
      delete process.env.DATABASE_URL;
      delete process.env.DVT_INTENT_RECONCILER_ENABLED;
    }
  });

  it('migrates principal grants before serving protected runtime routes', async () => {
    const originalAccessRepoMigrate = PostgresPrincipalAccessRepository.prototype.migrate;
    const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
    const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
    const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
    let accessRepoMigrateCalls = 0;
    let planStoreMigrateCalls = 0;
    let stateStoreMigrateCalls = 0;
    let intentStoreMigrateCalls = 0;

    PostgresPrincipalAccessRepository.prototype.migrate = async function migrate() {
      accessRepoMigrateCalls += 1;
    };
    PostgresPlanStore.prototype.migrate = async function migrate() {
      planStoreMigrateCalls += 1;
    };
    PostgresStateStoreAdapter.prototype.migrate = async function migrate() {
      stateStoreMigrateCalls += 1;
    };
    PostgresStartRunIntentStore.prototype.migrate = async function migrate() {
      intentStoreMigrateCalls += 1;
    };

    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';

    try {
      const { app } = await buildApp();
      await app.ready();

      expect(accessRepoMigrateCalls).toBe(1);
      expect(planStoreMigrateCalls).toBe(1);
      expect(stateStoreMigrateCalls).toBe(1);
      expect(intentStoreMigrateCalls).toBe(1);

      await app.close();
    } finally {
      PostgresPrincipalAccessRepository.prototype.migrate = originalAccessRepoMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      delete process.env.DATABASE_URL;
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
    }
  });

  it('fails fast when OIDC is enabled without DATABASE_URL', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';

    try {
      await expect(() => buildApp()).rejects.toThrow(
        /DATABASE_URL is required when OIDC-protected runtime routes are enabled/
      );
    } finally {
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
    }
  });
});
