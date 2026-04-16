import process from 'node:process';

import { describe, it, expect, vi } from 'vitest';

import { buildApp } from '../src/app.js';
import * as pgPool from '../src/db/pool.js';
import { PostgresPrincipalAccessRepository } from '../src/infrastructure/auth/postgresPrincipalAccessRepository.js';
import { PostgresWorkspaceGraphDraftStore } from '../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import { HTTP_STATUS } from '../src/routes/healthContract.js';

const adapterPostgres = await import('@dvt/adapter-postgres');
const { PostgresPlanStore, PostgresStartRunIntentStore, PostgresStateStoreAdapter } =
  adapterPostgres;

function httpError(
  type: string,
  reason: string,
  target?: string
): { error: { type: string; reason: string; target?: string } } {
  return {
    error: {
      type,
      reason,
      ...(target === undefined ? {} : { target }),
    },
  };
}

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
    expect(res.statusCode).toBe(HTTP_STATUS.ok);
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

  it('returns 503 on /readyz when database dependency is not configured', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DVT_READYZ_ENABLED = 'true';

    try {
      const { app } = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/readyz',
      });
      expect(res.statusCode).toBe(HTTP_STATUS.serviceUnavailable);
      expect(res.json()).toEqual({
        ok: false,
        status: 'not_ready',
        reasonCode: 'database_not_configured',
      });
      await app.close();
    } finally {
      delete process.env.DVT_READYZ_ENABLED;
    }
  });

  it('returns 503 on /readyz while reconciler is starting', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DVT_READYZ_ENABLED = 'true';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.DVT_INTENT_RECONCILER_ENABLED = 'true';

    try {
      const { app } = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/readyz',
      });
      expect(res.statusCode).toBe(HTTP_STATUS.serviceUnavailable);
      expect(res.json()).toEqual({
        ok: false,
        status: 'not_ready',
        reasonCode: 'reconciler_starting',
      });
      await app.close();
    } finally {
      delete process.env.DVT_READYZ_ENABLED;
      delete process.env.DATABASE_URL;
      delete process.env.DVT_INTENT_RECONCILER_ENABLED;
    }
  });

  it('returns 503 on /readyz when reconciler is degraded', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DVT_READYZ_ENABLED = 'true';
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
        url: '/readyz',
      });
      expect(res.statusCode).toBe(HTTP_STATUS.serviceUnavailable);
      expect(res.json()).toEqual({
        ok: false,
        status: 'not_ready',
        reasonCode: 'reconciler_degraded',
      });
      await app.close();
    } finally {
      delete process.env.DVT_READYZ_ENABLED;
      delete process.env.DATABASE_URL;
      delete process.env.DVT_INTENT_RECONCILER_ENABLED;
    }
  });

  it('emits structured readiness event when database probe fails', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DVT_READYZ_ENABLED = 'true';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    const queryMock = vi.fn(async () => {
      throw new Error('database probe failed');
    });
    const getPgPoolSpy = vi.spyOn(pgPool, 'getPgPool').mockReturnValue({
      query: queryMock,
    } as never);

    try {
      const { app } = await buildApp();
      const warnSpy = vi.spyOn(app.log, 'warn');
      const res = await app.inject({
        method: 'GET',
        url: '/readyz',
      });

      expect(res.statusCode).toBe(HTTP_STATUS.serviceUnavailable);
      expect(res.json()).toEqual({
        ok: false,
        status: 'not_ready',
        reasonCode: 'database_unavailable',
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'api.health.readiness.database_probe_failed',
        })
      );
      expect(queryMock).toHaveBeenCalledOnce();

      await app.close();
    } finally {
      getPgPoolSpy.mockRestore();
      delete process.env.DVT_READYZ_ENABLED;
      delete process.env.DATABASE_URL;
    }
  });

  it('returns 200 on /readyz when all probes pass', async () => {
    const originalAccessRepoMigrate = PostgresPrincipalAccessRepository.prototype.migrate;
    const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
    const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
    const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
    const originalWorkspaceGraphDraftStoreMigrate = PostgresWorkspaceGraphDraftStore.prototype.migrate;
    const queryMock = vi.fn(async () => ({ rows: [{ ok: 1 }] }));
    const getPgPoolSpy = vi.spyOn(pgPool, 'getPgPool').mockReturnValue({
      query: queryMock,
      end: vi.fn(async () => undefined),
    } as never);

    PostgresPrincipalAccessRepository.prototype.migrate = async function migrate() {};
    PostgresPlanStore.prototype.migrate = async function migrate() {};
    PostgresStateStoreAdapter.prototype.migrate = async function migrate() {};
    PostgresStartRunIntentStore.prototype.migrate = async function migrate() {};
    PostgresWorkspaceGraphDraftStore.prototype.migrate = async function migrate() {};

    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DVT_READYZ_ENABLED = 'true';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';
    delete process.env.DVT_INTENT_RECONCILER_ENABLED;

    try {
      const { app } = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/readyz',
      });

      expect(res.statusCode).toBe(HTTP_STATUS.ok);
      expect(res.json()).toEqual({
        ok: true,
        status: 'ready',
      });
      expect(queryMock).toHaveBeenCalledOnce();

      await app.close();
    } finally {
      getPgPoolSpy.mockRestore();
      PostgresPrincipalAccessRepository.prototype.migrate = originalAccessRepoMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      PostgresWorkspaceGraphDraftStore.prototype.migrate =
        originalWorkspaceGraphDraftStoreMigrate;
      delete process.env.DVT_READYZ_ENABLED;
      delete process.env.DATABASE_URL;
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
      delete process.env.DVT_INTENT_RECONCILER_ENABLED;
    }
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
      expect(res.statusCode).toBe(HTTP_STATUS.ok);
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
      expect(res.statusCode).toBe(HTTP_STATUS.ok);
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

      expect(res.statusCode).toBe(HTTP_STATUS.ok);
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

  it('migrates principal grants before serving protected runtime routes', async () => {
    const originalAccessRepoMigrate = PostgresPrincipalAccessRepository.prototype.migrate;
    const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
    const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
    const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
    const originalWorkspaceGraphDraftStoreMigrate = PostgresWorkspaceGraphDraftStore.prototype.migrate;
    let accessRepoMigrateCalls = 0;
    let planStoreMigrateCalls = 0;
    let stateStoreMigrateCalls = 0;
    let intentStoreMigrateCalls = 0;
    let workspaceGraphDraftStoreMigrateCalls = 0;

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
    PostgresWorkspaceGraphDraftStore.prototype.migrate = async function migrate() {
      workspaceGraphDraftStoreMigrateCalls += 1;
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
      expect(workspaceGraphDraftStoreMigrateCalls).toBe(1);

      await app.close();
    } finally {
      PostgresPrincipalAccessRepository.prototype.migrate = originalAccessRepoMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      PostgresWorkspaceGraphDraftStore.prototype.migrate =
        originalWorkspaceGraphDraftStoreMigrate;
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

  it('does not register the admin rebuild route when admin routes are flagged on without OIDC config', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DVT_ADMIN_ROUTES_ENABLED = 'true';
    delete process.env.DATABASE_URL;
    delete process.env.OIDC_JWKS_URI;
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_AUDIENCE;

    try {
      const { app } = await buildApp();

      const adminResponse = await app.inject({
        method: 'POST',
        url: '/admin/runs/run-1/rebuild-snapshot',
        payload: {
          tenantId: 'tenant-a',
        },
      });
      const protectedResponse = await app.inject({
        method: 'POST',
        url: '/runs/start',
        payload: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'env-a',
          selection: ['model.orders'],
          planRef: {
            uri: 'https://plans.example.com/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0',
          },
          runId: 'run-1',
          targetAdapter: 'mock',
        },
      });
      const previewResponse = await app.inject({
        method: 'POST',
        url: '/plans/preview',
        payload: {
          context: {
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'env-a',
            targetAdapter: 'mock',
          },
          selectedNodeIds: ['model.orders'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      });

      expect(adminResponse.statusCode).toBe(404);
      expect(protectedResponse.statusCode).toBe(404);
      expect(previewResponse.statusCode).toBe(404);

      await app.close();
    } finally {
      delete process.env.DVT_ADMIN_ROUTES_ENABLED;
      delete process.env.DATABASE_URL;
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
    }
  });

  it('keeps the admin rebuild route disabled when OIDC configuration is only partially present', async () => {
    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DVT_ADMIN_ROUTES_ENABLED = 'true';
    delete process.env.DATABASE_URL;
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    delete process.env.OIDC_ISSUER;
    process.env.OIDC_AUDIENCE = 'dvt-api';

    try {
      const { app } = await buildApp();
      const adminResponse = await app.inject({
        method: 'POST',
        url: '/admin/runs/run-2/rebuild-snapshot',
        payload: {
          tenantId: 'tenant-a',
        },
      });
      const protectedResponse = await app.inject({
        method: 'POST',
        url: '/runs/start',
        payload: {
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'env-a',
          selection: ['model.orders'],
          planRef: {
            uri: 'https://plans.example.com/plan.json',
            sha256: 'b'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-b',
            planVersion: '1.0',
          },
          runId: 'run-2',
          targetAdapter: 'mock',
        },
      });
      const previewResponse = await app.inject({
        method: 'POST',
        url: '/plans/preview',
        payload: {
          context: {
            runId: 'run-2',
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'env-a',
            targetAdapter: 'mock',
          },
          selectedNodeIds: ['model.orders'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      });

      expect(adminResponse.statusCode).toBe(404);
      expect(protectedResponse.statusCode).toBe(404);
      expect(previewResponse.statusCode).toBe(404);

      await app.close();
    } finally {
      delete process.env.DVT_ADMIN_ROUTES_ENABLED;
      delete process.env.DATABASE_URL;
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
    }
  });

  it('wires DVT_SIGNAL_ROUTE_ALLOW_CANCEL into /runs/:runId/signal parsing', async () => {
    const originalAccessRepoMigrate = PostgresPrincipalAccessRepository.prototype.migrate;
    const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
    const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
    const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
    const queryMock = vi.fn(async () => ({ rows: [{ ok: 1 }] }));
    const getPgPoolSpy = vi.spyOn(pgPool, 'getPgPool').mockReturnValue({
      query: queryMock,
      end: vi.fn(async () => undefined),
    } as never);

    PostgresPrincipalAccessRepository.prototype.migrate = async function migrate() {};
    PostgresPlanStore.prototype.migrate = async function migrate() {};
    PostgresStateStoreAdapter.prototype.migrate = async function migrate() {};
    PostgresStartRunIntentStore.prototype.migrate = async function migrate() {};

    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';
    process.env.DVT_SIGNAL_ROUTE_ALLOW_CANCEL = 'false';

    try {
      const { app } = await buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/runs/run-1/signal',
        payload: {
          tenantId: 'tenant-a',
          signalType: 'CANCEL',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual(
        httpError('bad_request', 'invalid_signal_type', 'signalType')
      );
      await app.close();
    } finally {
      getPgPoolSpy.mockRestore();
      PostgresPrincipalAccessRepository.prototype.migrate = originalAccessRepoMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      delete process.env.DATABASE_URL;
      delete process.env.OIDC_JWKS_URI;
      delete process.env.OIDC_ISSUER;
      delete process.env.OIDC_AUDIENCE;
      delete process.env.DVT_SIGNAL_ROUTE_ALLOW_CANCEL;
    }
  });

  it('mounts /plans/preview only behind protected runtime auth and returns typed missing-bearer-token', async () => {
    const originalAccessRepoMigrate = PostgresPrincipalAccessRepository.prototype.migrate;
    const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
    const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
    const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
    const queryMock = vi.fn(async () => ({ rows: [{ ok: 1 }] }));
    const getPgPoolSpy = vi.spyOn(pgPool, 'getPgPool').mockReturnValue({
      query: queryMock,
      end: vi.fn(async () => undefined),
    } as never);

    PostgresPrincipalAccessRepository.prototype.migrate = async function migrate() {};
    PostgresPlanStore.prototype.migrate = async function migrate() {};
    PostgresStateStoreAdapter.prototype.migrate = async function migrate() {};
    PostgresStartRunIntentStore.prototype.migrate = async function migrate() {};

    process.env.OBS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
    process.env.OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
    process.env.OIDC_ISSUER = 'https://issuer.example/';
    process.env.OIDC_AUDIENCE = 'dvt-api';

    try {
      const { app } = await buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/plans/preview',
        payload: {
          context: {
            runId: 'run-preview-1',
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'env-a',
            targetAdapter: 'mock',
          },
          selectedNodeIds: ['model.orders'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual(httpError('unauthorized', 'missing_token'));

      await app.close();
    } finally {
      getPgPoolSpy.mockRestore();
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
});
