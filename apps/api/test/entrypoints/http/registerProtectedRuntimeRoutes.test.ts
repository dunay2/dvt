import type { IObservability } from '@dvt/observability';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { registerProtectedRuntimeRoutes } from '../../../src/entrypoints/http/registerProtectedRuntimeRoutes.js';
import { PROTECTED_RUNTIME_ROUTE_SUMMARY } from '../../../src/entrypoints/http/runtimeRoutes.constants.js';
import type { ProtectedRuntimeModule } from '../../../src/modules/types.js';
import { loadEnv } from '../../../src/plugins/env.js';
import { ADMIN_ROUTES_ENABLED_ENV, BASE_APP_ENV, mergeEnv } from '../../app/appEnvTestSupport.js';

function protectedRuntimeModule(): ProtectedRuntimeModule {
  return {
    adapters: new Map(),
    authenticator: {
      authenticateBearerToken: async () => ({ ok: false, code: 'missing_bearer_token' }),
    },
    authorizer: { authorize: async () => ({ ok: false, reason: 'missing_scope' }) },
    close: async () => undefined,
    createProjectUseCase: { execute: async () => ({ kind: 'tenant_not_granted' }) },
    dbtProjectImport: {
      projectGraphUseCase: {},
      selectedModelAnalysisQuery: {},
      selectedModelAnalysisResolver: {},
      validateUseCase: {},
      importUseCase: {},
    },
    engine: {},
    executablePlanResolver: { fetch: async () => ({}) },
    facade: {},
    getWorkspaceGraphDraftUseCase: {},
    listProjectsUseCase: { execute: async () => ({ tenants: [], projects: [] }) },
    listWorkspacePluginsUseCase: { execute: async () => [] },
    migrate: async () => undefined,
    planCompilePlanner: {},
    planner: {},
    planStore: {},
    planValidator: {},
    runEnrichmentService: {},
    runHealthService: {},
    saveWorkspaceGraphDraftUseCase: {},
    startRunTargetAdapterRegistry: {},
    stateStore: {
      maintenance: {},
      read: {},
      snapshotStaleness: {},
    },
    workspaceContextQuery: { getEffectiveWorkspaceContext: async () => null },
    workspaceFilesRoot: process.cwd(),
    workspaceGraphDraftCapabilityService: {},
    workspaceGraphDraftStore: {},
  } as unknown as ProtectedRuntimeModule;
}

const observability: IObservability = {
  logs: {
    debug: () => undefined,
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined,
  },
  metrics: {
    counter: () => ({ add: () => undefined }),
    gauge: () => ({ set: () => undefined }),
    histogram: () => ({ record: () => undefined }),
  },
  traces: {
    startSpan: () => ({
      end: () => undefined,
      recordException: () => undefined,
      setAttribute: () => undefined,
      setAttributes: () => undefined,
      setStatus: () => undefined,
    }),
    withSpan: (_name, _options, fn) =>
      fn({
        end: () => undefined,
        recordException: () => undefined,
        setAttribute: () => undefined,
        setAttributes: () => undefined,
        setStatus: () => undefined,
      }),
  },
  withContext: (_ctx, fn) => fn(),
};

describe('registerProtectedRuntimeRoutes', () => {
  it('mounts protected runtime HTTP routes as one entrypoint component', async () => {
    const app = Fastify({ logger: false });

    await registerProtectedRuntimeRoutes(app, {
      env: loadEnv(BASE_APP_ENV),
      observability,
      protectedModule: protectedRuntimeModule(),
    });
    await app.ready();

    const registeredRoutes = PROTECTED_RUNTIME_ROUTE_SUMMARY.split(', ').map((entry) => {
      const separator = entry.indexOf(' ');
      return {
        method: entry.slice(0, separator),
        url: entry.slice(separator + 1),
      };
    });

    expect(new Set(registeredRoutes.map(({ method, url }) => `${method} ${url}`)).size).toBe(
      registeredRoutes.length
    );
    for (const route of registeredRoutes) {
      expect(app.hasRoute(route), `${route.method} ${route.url} must be registered`).toBe(true);
    }
    expect(app.hasRoute({ method: 'POST', url: '/admin/runs/:runId/rebuild-snapshot' })).toBe(
      false
    );
  });

  it('mounts admin repair route only when explicitly enabled', async () => {
    const app = Fastify({ logger: false });

    await registerProtectedRuntimeRoutes(app, {
      env: loadEnv(mergeEnv(BASE_APP_ENV, ADMIN_ROUTES_ENABLED_ENV)),
      observability,
      protectedModule: protectedRuntimeModule(),
    });
    await app.ready();

    expect(app.hasRoute({ method: 'POST', url: '/admin/runs/:runId/rebuild-snapshot' })).toBe(true);
  });

  it('rate limits protected runtime routes before repeated authorization attempts continue', async () => {
    const app = Fastify({ logger: false });
    const env = loadEnv(
      mergeEnv(BASE_APP_ENV, {
        DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX: '1',
        DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS: '60000',
      })
    );
    await app.register(rateLimit, {
      global: false,
      max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    });

    await registerProtectedRuntimeRoutes(app, {
      env,
      observability,
      protectedModule: protectedRuntimeModule(),
    });
    await app.ready();

    const first = await app.inject({
      method: 'GET',
      url: '/runs?tenantId=tenant-a',
    });
    const second = await app.inject({
      method: 'GET',
      url: '/runs?tenantId=tenant-a',
    });

    expect(first.statusCode).not.toBe(429);
    expect(second.statusCode).toBe(429);
  });
});
