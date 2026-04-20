import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { asIsoUtcString } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';
import { describe, expect, it } from 'vitest';

import { buildProtectedRuntimeModule } from '../src/modules/buildProtectedRuntimeModule.js';
import { buildProviderAdapters } from '../src/modules/buildProviderAdapters.js';
import { buildPlanCompilePlanner } from '../src/modules/planCompilePlannerProfile.js';
import { PLAN_COMPILE_PROFILE_SPEC } from '../src/modules/planCompileProfileSpec.js';
import { registerOperationalHooks } from '../src/modules/registerOperationalHooks.js';

const BUILD_PROTECTED_RUNTIME_MODULE_SOURCE = readFileSync(
  new URL('../src/modules/buildProtectedRuntimeModule.ts', import.meta.url),
  'utf8'
);

describe('modules', () => {
  it('buildProtectedRuntimeModule fails fast without DATABASE_URL', async () => {
    const fakeApp = { log: { info() {}, warn() {}, error() {} } } as unknown as FastifyInstance;

    await expect(() =>
      buildProtectedRuntimeModule(fakeApp, {} as never, {} as never)
    ).rejects.toThrow(/DATABASE_URL is required when OIDC-protected runtime routes are enabled/);
  });

  it('registerOperationalHooks wires migrate and close hooks', async () => {
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
      authenticator: {} as never,
      authorizer: {} as never,
      engine: {} as never,
      runEnrichmentService: {} as never,
      runHealthService: {} as never,
      adapters: new Map(),
      startRunTargetAdapterRegistry: {
        isSupported(_value: string): _value is 'mock' | 'temporal' {
          return false;
        },
        listSupported(): ReadonlyArray<'mock' | 'temporal'> {
          return [];
        },
      },
      stateStore: {
        read: {} as never,
        write: {} as never,
        maintenance: {} as never,
        snapshotStaleness: {} as never,
      },
      planner: {} as never,
      planCompilePlanner: {} as never,
      planStore: {} as never,
      planValidator: {} as never,
      executablePlanResolver: { fetch: async () => ({}) } as never,
      workspaceGraphDraftStore: {
        async migrate() {},
        async close() {},
        async read() {
          return null;
        },
        async save() {
          return { kind: 'idempotency_mismatch' as const };
        },
      },
      workspaceGraphDraftCapabilityService: {
        async authorize() {
          return {} as never;
        },
      } as never,
      getWorkspaceGraphDraftUseCase: {
        async execute() {
          return { kind: 'not_found' as const };
        },
      } as never,
      saveWorkspaceGraphDraftUseCase: {
        async execute() {
          return { kind: 'unsupported_schema_version' as const };
        },
      } as never,
      async migrate() {
        migrateCalls += 1;
      },
      async close() {
        closeCalls += 1;
      },
    });

    await hooks.get('onReady')?.();
    await hooks.get('onClose')?.();

    expect(migrateCalls).toBe(1);
    expect(closeCalls).toBe(1);
  });

  it('buildProviderAdapters always registers the mock adapter', async () => {
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
          async getRunMetadataByRunId() {
            return null;
          },
          async listEvents() {
            return [];
          },
        },
        stateStoreWrite: {
          async appendAndEnqueueTx() {
            return {
              appended: [],
              deduped: [],
              lastSeq: 0,
            };
          },
        },
        clock: { nowIsoUtc: () => asIsoUtcString('2026-02-12T00:00:00.000Z') },
        projector: {
          rebuild() {
            return {};
          },
        },
        observability: { logs: { info() {}, warn() {}, error() {}, debug() {} } } as never,
      }
    );

    expect(result.adapters.size).toBe(1);
    expect(result.adapters.has('mock')).toBe(true);

    await expect(result.close()).resolves.toBeUndefined();
  });

  it('buildProtectedRuntimeModule wires an artifact-backed runExecutionContext resolver', () => {
    expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
      'new ArtifactBackedRunExecutionContextResolver'
    );
    expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain(
      'new ArtifactStoreDbtProjectBundleBindingPolicy'
    );
    expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain('runExecutionContextResolver,');
    expect(BUILD_PROTECTED_RUNTIME_MODULE_SOURCE).toContain('runExecutionContextBindingPolicy,');
  });

  it('plan compile planner rejects DBT step kinds not listed in the compile profile', async () => {
    const planner = buildPlanCompilePlanner();

    await expect(
      planner.buildPlan({
        requestedBy: 'principal-1',
        requestId: 'req-compile-reject-dbt',
        requestedAtIso: '2026-04-17T00:00:00.000Z',
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'dbt-node-1', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
        selection: {
          selectedNodeIds: ['dbt-node-1'],
        },
      })
    ).rejects.toThrow(/DBT_MODEL/);
  });

  it('plan compile planner accepts a non-dbt spark graph from the resolved catalog', async () => {
    const planner = buildPlanCompilePlanner();

    const result = await planner.buildPlan({
      requestedBy: 'principal-1',
      requestId: 'req-compile-spark',
      requestedAtIso: '2026-04-19T00:00:00.000Z',
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'spark-job-graph',
        sourceVersion: 'spark-application-v1',
        nodes: [
          {
            nodeId: 'spark-job-1',
            stepKind: 'SPARK_JOB',
            dependsOn: [],
            stepTypeConfig: {
              application: 'orders-daily',
              entrypoint: 'jobs/orders.py',
              runtime: 'python',
            },
          },
        ],
      },
      selection: {
        selectedNodeIds: ['spark-job-1'],
      },
    });

    expect(result.plan.steps).toMatchObject([
      {
        stepId: 'spark-job-1',
        kind: 'SPARK_JOB',
        dependsOn: [],
        stepTypeConfig: {
          application: 'orders-daily',
          entrypoint: 'jobs/orders.py',
          runtime: 'python',
        },
      },
    ]);
    expect(result.executionPolicy.requiresCapabilities).toEqual(['spark.submit']);
  });

  it('plan compile planner rejects profile kinds that fall outside the allowed families', () => {
    expect(() =>
      buildPlanCompilePlanner({
        ...PLAN_COMPILE_PROFILE_SPEC,
        allowedFamilies: ['spark'],
        allowedStepKinds: ['POSTGRES_SQL_TRANSFORM'],
      })
    ).toThrow(/POSTGRES_SQL_TRANSFORM/);
  });
});
