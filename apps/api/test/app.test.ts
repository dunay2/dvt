import process from 'node:process';

import { describe, it, expect, vi } from 'vitest';

import { buildApp } from '../src/app.js';
import * as pgPool from '../src/db/pool.js';
import { EmbeddedAccessDecisionService } from '../src/infrastructure/auth/embeddedAccessDecisionService.js';
import { PostgresWorkspaceGraphDraftStore } from '../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import { HTTP_STATUS } from '../src/routes/healthContract.js';

const adapterPostgres = await import('@dvt/adapter-postgres');
const { PostgresPlanStore, PostgresStartRunIntentStore, PostgresStateStoreAdapter } =
  adapterPostgres;

const TEST_DATABASE_URL = 'postgres://user:pass@localhost:5432/dvt';
const TEST_OIDC_JWKS_URI = 'https://issuer.example/.well-known/jwks.json';
const TEST_OIDC_ISSUER = 'https://issuer.example/';
const TEST_OIDC_AUDIENCE = 'dvt-api';

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

function setBaseTestEnv(): void {
  process.env.OBS_ENABLED = 'false';
  process.env.NODE_ENV = 'test';
}

function setDatabaseEnv(): void {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

function setOidcEnv(): void {
  process.env.OIDC_JWKS_URI = TEST_OIDC_JWKS_URI;
  process.env.OIDC_ISSUER = TEST_OIDC_ISSUER;
  process.env.OIDC_AUDIENCE = TEST_OIDC_AUDIENCE;
}

function clearProtectedRuntimeEnv(): void {
  delete process.env.DATABASE_URL;
  delete process.env.OIDC_JWKS_URI;
  delete process.env.OIDC_ISSUER;
  delete process.env.OIDC_AUDIENCE;
}

function buildStartRunPayload(args: {
  readonly planId: string;
  readonly sha256: string;
}): Record<string, unknown> {
  return {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
    selection: {
      mode: 'explicit',
      nodeIds: ['model.orders'],
    },
    planRef: {
      uri: 'https://plans.example.com/plan.json',
      sha256: args.sha256,
      schemaVersion: 'v1.0',
      planId: args.planId,
      planVersion: '1.0',
    },
    targetAdapter: 'mock',
  };
}

function buildPreviewPayload(runId: string): Record<string, unknown> {
  return {
    context: {
      runId,
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      targetAdapter: 'mock',
    },
    selection: {
      mode: 'explicit',
      nodeIds: ['model.orders'],
    },
    graphSource: {
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: 'manifest-v10',
      nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
    },
  };
}

function buildCompilePayload(): Record<string, unknown> {
  return {
    context: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
    },
    selection: {
      selectedNodeIds: ['source-1', 'transform-1', 'sink-1'],
    },
    graphSource: {
      kind: 'generic-graph-v1',
      sourceFamily: 'transformation-design-graph',
      sourceVersion: 'transformation-sql-first-v1',
      nodes: [
        {
          nodeId: 'source-1',
          stepKind: 'PREPARE_POSTGRES_TRANSFORM',
          dependsOn: [],
          stepTypeConfig: {
            targetSchema: 'analytics',
            sourceSchema: 'raw',
            sourceTable: 'orders',
            sourceAlias: 'orders_src',
          },
        },
        {
          nodeId: 'transform-1',
          stepKind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['source-1'],
          stepTypeConfig: {
            dialect: 'postgres',
            entrypoint: 'models/orders.sql',
            sql: 'select * from raw.orders',
            sqlArtifact: {
              repo: 'org/repo',
              path: 'models/orders.sql',
              ref: 'refs/heads/main',
              commitSha: 'commit-sql-1',
              contentSha256: 'a'.repeat(64),
            },
            sourceSchema: 'raw',
            sourceTable: 'orders',
            sourceAlias: 'orders_src',
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {
          nodeId: 'sink-1',
          stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          dependsOn: ['transform-1'],
          stepTypeConfig: {
            sinkSchema: 'analytics',
            sinkTable: 'orders_daily',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      ],
    },
  };
}

type ProtectedRuntimeMigrationPatch = {
  restore(): void;
};

function patchProtectedRuntimeMigrations(): ProtectedRuntimeMigrationPatch {
  const originalAccessDecisionMigrate = EmbeddedAccessDecisionService.prototype.migrate;
  const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
  const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
  const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
  const originalWorkspaceGraphDraftStoreMigrate =
    PostgresWorkspaceGraphDraftStore.prototype.migrate;

  EmbeddedAccessDecisionService.prototype.migrate = async function migrate() {};
  PostgresPlanStore.prototype.migrate = async function migrate() {};
  PostgresStateStoreAdapter.prototype.migrate = async function migrate() {};
  PostgresStartRunIntentStore.prototype.migrate = async function migrate() {};
  PostgresWorkspaceGraphDraftStore.prototype.migrate = async function migrate() {};

  return {
    restore() {
      EmbeddedAccessDecisionService.prototype.migrate = originalAccessDecisionMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      PostgresWorkspaceGraphDraftStore.prototype.migrate = originalWorkspaceGraphDraftStoreMigrate;
    },
  };
}

function mockPgPool(queryMock = vi.fn(async () => ({ rows: [{ ok: 1 }] }))): {
  mockRestore(): void;
} {
  return vi.spyOn(pgPool, 'getPgPool').mockReturnValue({
    query: queryMock,
    end: vi.fn(async () => undefined),
  } as never);
}

async function injectProtectedRouteMountChecks(
  app: Awaited<ReturnType<typeof buildApp>>['app'],
  args: {
    readonly runId: string;
    readonly planId: string;
    readonly sha256: string;
  }
): Promise<void> {
  const adminResponse = await app.inject({
    method: 'POST',
    url: `/admin/runs/${args.runId}/rebuild-snapshot`,
    payload: {
      tenantId: 'tenant-a',
    },
  });
  const protectedResponse = await app.inject({
    method: 'POST',
    url: '/runs/start',
    payload: buildStartRunPayload({ planId: args.planId, sha256: args.sha256 }),
  });
  const previewResponse = await app.inject({
    method: 'POST',
    url: '/plans/preview',
    payload: buildPreviewPayload(args.runId),
  });
  const compileResponse = await app.inject({
    method: 'POST',
    url: '/plans/compile',
    payload: buildCompilePayload(),
  });

  expect(adminResponse.statusCode).toBe(404);
  expect(protectedResponse.statusCode).toBe(404);
  expect(previewResponse.statusCode).toBe(404);
  expect(compileResponse.statusCode).toBe(404);
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
    const queryMock = vi.fn(async () => ({ rows: [{ ok: 1 }] }));
    const migrations = patchProtectedRuntimeMigrations();
    const getPgPoolSpy = mockPgPool(queryMock);

    setBaseTestEnv();
    process.env.DVT_READYZ_ENABLED = 'true';
    setDatabaseEnv();
    setOidcEnv();
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
      migrations.restore();
      delete process.env.DVT_READYZ_ENABLED;
      clearProtectedRuntimeEnv();
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

  it('migrates embedded access decisions before serving protected runtime routes', async () => {
    const originalAccessDecisionMigrate = EmbeddedAccessDecisionService.prototype.migrate;
    const originalPlanStoreMigrate = PostgresPlanStore.prototype.migrate;
    const originalStateStoreMigrate = PostgresStateStoreAdapter.prototype.migrate;
    const originalIntentStoreMigrate = PostgresStartRunIntentStore.prototype.migrate;
    const originalWorkspaceGraphDraftStoreMigrate =
      PostgresWorkspaceGraphDraftStore.prototype.migrate;
    let accessDecisionMigrateCalls = 0;
    let planStoreMigrateCalls = 0;
    let stateStoreMigrateCalls = 0;
    let intentStoreMigrateCalls = 0;
    let workspaceGraphDraftStoreMigrateCalls = 0;

    EmbeddedAccessDecisionService.prototype.migrate = async function migrate() {
      accessDecisionMigrateCalls += 1;
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

      expect(accessDecisionMigrateCalls).toBe(1);
      expect(planStoreMigrateCalls).toBe(1);
      expect(stateStoreMigrateCalls).toBe(1);
      expect(intentStoreMigrateCalls).toBe(1);
      expect(workspaceGraphDraftStoreMigrateCalls).toBe(1);

      await app.close();
    } finally {
      EmbeddedAccessDecisionService.prototype.migrate = originalAccessDecisionMigrate;
      PostgresPlanStore.prototype.migrate = originalPlanStoreMigrate;
      PostgresStateStoreAdapter.prototype.migrate = originalStateStoreMigrate;
      PostgresStartRunIntentStore.prototype.migrate = originalIntentStoreMigrate;
      PostgresWorkspaceGraphDraftStore.prototype.migrate = originalWorkspaceGraphDraftStoreMigrate;
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
    setBaseTestEnv();
    process.env.DVT_ADMIN_ROUTES_ENABLED = 'true';
    clearProtectedRuntimeEnv();

    try {
      const { app } = await buildApp();
      await injectProtectedRouteMountChecks(app, {
        runId: 'run-1',
        planId: 'plan-a',
        sha256: 'a'.repeat(64),
      });

      await app.close();
    } finally {
      delete process.env.DVT_ADMIN_ROUTES_ENABLED;
      clearProtectedRuntimeEnv();
    }
  });

  it('keeps the admin rebuild route disabled when OIDC configuration is only partially present', async () => {
    setBaseTestEnv();
    process.env.DVT_ADMIN_ROUTES_ENABLED = 'true';
    delete process.env.DATABASE_URL;
    process.env.OIDC_JWKS_URI = TEST_OIDC_JWKS_URI;
    delete process.env.OIDC_ISSUER;
    process.env.OIDC_AUDIENCE = TEST_OIDC_AUDIENCE;

    try {
      const { app } = await buildApp();
      await injectProtectedRouteMountChecks(app, {
        runId: 'run-2',
        planId: 'plan-b',
        sha256: 'b'.repeat(64),
      });

      await app.close();
    } finally {
      delete process.env.DVT_ADMIN_ROUTES_ENABLED;
      clearProtectedRuntimeEnv();
    }
  });

  it('wires DVT_SIGNAL_ROUTE_ALLOW_CANCEL into /runs/:runId/signal parsing', async () => {
    const migrations = patchProtectedRuntimeMigrations();
    const getPgPoolSpy = mockPgPool();

    setBaseTestEnv();
    setDatabaseEnv();
    setOidcEnv();
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
      migrations.restore();
      clearProtectedRuntimeEnv();
      delete process.env.DVT_SIGNAL_ROUTE_ALLOW_CANCEL;
    }
  });

  it('mounts /plans/preview only behind protected runtime auth and returns typed missing-bearer-token', async () => {
    const migrations = patchProtectedRuntimeMigrations();
    const getPgPoolSpy = mockPgPool();

    setBaseTestEnv();
    setDatabaseEnv();
    setOidcEnv();

    try {
      const { app } = await buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/plans/preview',
        payload: {
          ...buildPreviewPayload('run-preview-1'),
          previewProfile: 'planner-generic-v1',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual(httpError('unauthorized', 'missing_token'));

      await app.close();
    } finally {
      getPgPoolSpy.mockRestore();
      migrations.restore();
      clearProtectedRuntimeEnv();
    }
  });

  it('mounts /plans/compile only behind protected runtime auth and returns typed missing-bearer-token', async () => {
    const migrations = patchProtectedRuntimeMigrations();
    const getPgPoolSpy = mockPgPool();

    setBaseTestEnv();
    setDatabaseEnv();
    setOidcEnv();

    try {
      const { app } = await buildApp();
      const response = await app.inject({
        method: 'POST',
        url: '/plans/compile',
        payload: buildCompilePayload(),
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual(httpError('unauthorized', 'missing_token'));

      await app.close();
    } finally {
      getPgPoolSpy.mockRestore();
      migrations.restore();
      clearProtectedRuntimeEnv();
    }
  });
});
