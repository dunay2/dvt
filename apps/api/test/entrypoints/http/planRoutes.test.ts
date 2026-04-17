import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { compilePlanRoute } from '../../../src/entrypoints/http/compilePlanRoute.js';
import {
  importPlanRoute,
  previewPlanRoute,
} from '../../../src/entrypoints/http/planRoutes.js';

function createReply(): {
  statusCode: number;
  payload: unknown;
  headers: Record<string, string>;
  code(status: number): unknown;
  header(name: string, value: string): unknown;
  send(payload: unknown): unknown;
} {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    headers: {} as Record<string, string>,
    code(status: number) {
      this.statusCode = status;
      return this;
    },
    header(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
}

function okAuthDeps(): Record<string, unknown> {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true,
        principal: { principalId: 'principal-1' },
      })),
    },
    authorizer: {
      authorize: vi.fn(async () => ({
        ok: true,
        context: {
          principal: { principalId: 'principal-1' },
          authorizedAt: new Date('2026-04-05T00:00:00.000Z'),
        },
      })),
    },
  };
}

const VALID_PLAN_REF = {
  uri: 'dvt-plan://plans/plan-1',
  sha256: 'a'.repeat(64),
  schemaVersion: 'v1.2',
  planId: 'b'.repeat(64),
  planVersion: '1.0',
};

const PREVIEW_PROFILE_GENERIC = 'planner-generic-v1' as const;
const PREVIEW_PROFILE_TRANSFORMATION = 'transformation-sql-first-v1' as const;

const VALID_PREVIEW_PROVENANCE = {
  graphArtifact: {
    repo: 'org/repo',
    ref: 'refs/heads/main',
    path: 'models/graph.yml',
    commitSha: 'commit-graph-1',
    contentSha256: 'c'.repeat(64),
  },
  sqlArtifact: {
    repo: 'org/repo',
    ref: 'refs/heads/main',
    path: 'models/model.sql',
    commitSha: 'commit-sql-1',
    contentSha256: 'd'.repeat(64),
  },
} as const;

const VALID_TRANSFORMATION_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'transformation-design-graph',
  sourceVersion: 'transformation-sql-first-v1',
  nodes: [
    {
      nodeId: 'source-node',
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
      nodeId: 'transform-node',
      stepKind: 'POSTGRES_SQL_TRANSFORM',
      dependsOn: ['source-node'],
      stepTypeConfig: {
        dialect: 'postgres',
        entrypoint: 'models/model.sql',
        sql: 'select * from raw.orders',
        sqlArtifact: VALID_PREVIEW_PROVENANCE.sqlArtifact,
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
      nodeId: 'sink-node',
      stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
      dependsOn: ['transform-node'],
      stepTypeConfig: {
        sinkSchema: 'analytics',
        sinkTable: 'orders_daily',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  ],
} as const;

function buildTransformationStoredPlan(): Record<string, unknown> {
  return {
    metadata: {
      planId: VALID_PLAN_REF.planId,
      planVersion: VALID_PLAN_REF.planVersion,
      schemaVersion: VALID_PLAN_REF.schemaVersion,
      contractVersion: '1.0.0',
      inputHashSha256: VALID_PLAN_REF.sha256,
      createdAtIso: '2026-04-05T00:00:00.000Z',
    },
    steps: [
      {
        stepId: 'source-node',
        kind: 'PREPARE_POSTGRES_TRANSFORM',
        dependsOn: [],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[0].stepTypeConfig,
      },
      {
        stepId: 'transform-node',
        kind: 'POSTGRES_SQL_TRANSFORM',
        dependsOn: ['source-node'],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[1].stepTypeConfig,
      },
      {
        stepId: 'sink-node',
        kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
        dependsOn: ['transform-node'],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[2].stepTypeConfig,
      },
    ],
  } as const;
}

function buildStoredPlan(): {
  readonly metadata: {
    readonly planId: string;
    readonly planVersion: string;
    readonly schemaVersion: string;
    readonly contractVersion: string;
    readonly inputHashSha256: string;
    readonly createdAtIso: string;
  };
  readonly steps: readonly [];
} {
  return {
    metadata: {
      planId: VALID_PLAN_REF.planId,
      planVersion: VALID_PLAN_REF.planVersion,
      schemaVersion: VALID_PLAN_REF.schemaVersion,
      contractVersion: '1.0.0',
      inputHashSha256: VALID_PLAN_REF.sha256,
      createdAtIso: '2026-04-05T00:00:00.000Z',
    },
    steps: [],
  } as const;
}

describe('planRoutes', () => {
  it('returns 400 on preview when body.context is missing', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-invalid',
        headers: {},
        body: { selectedNodeIds: ['node_1'] },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: { type: 'bad_request', reason: 'invalid_body' } });
  });

  it('returns 401 on preview when bearer token is missing', async () => {
    const reply = createReply();
    const deps = {
      authenticator: {
        authenticateBearerToken: vi.fn(async () => ({ ok: false, code: 'missing_bearer_token' })),
      },
      authorizer: { authorize: vi.fn() },
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn() },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-missing-token',
        headers: {},
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({
      error: { type: 'unauthorized', reason: 'missing_bearer_token' },
    });
    expect(deps.authorizer.authorize).not.toHaveBeenCalled();
  });

  it('returns 403 on preview when principal is not granted run:start', async () => {
    const reply = createReply();
    const deps = {
      authenticator: {
        authenticateBearerToken: vi.fn(async () => ({
          ok: true,
          principal: { principalId: 'principal-1' },
        })),
      },
      authorizer: {
        authorize: vi.fn(async () => ({
          ok: false,
          reason: 'action_not_granted',
        })),
      },
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn() },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-forbidden',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({
      error: { type: 'forbidden', reason: 'action_not_granted' },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('returns plan and planRef from preview route', async () => {
    const reply = createReply();
    const plan = buildStoredPlan();
    const buildPlan = vi.fn(async () => ({
      plan,
      canonicalPlanJson: '{}',
    }));
    const storePlan = vi.fn(async () => VALID_PLAN_REF);
    const markValid = vi.fn(async () => undefined);
    const markInvalid = vi.fn(async () => undefined);
    const validatePlan = vi.fn(async () => ({
      status: 'OK',
      planId: VALID_PLAN_REF.planId,
      adapterId: 'mock',
    }));
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan },
      planStore: { storePlan, markValid, markInvalid },
      planValidator: { validatePlan },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-ok',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      previewProfile: PREVIEW_PROFILE_GENERIC,
      plan,
      planRef: VALID_PLAN_REF,
      persisted: {
        planRecordId: VALID_PLAN_REF.planId,
        canonicalPlanSha256: sha256HexUtf8(jcsCanonicalize(plan)),
      },
      validation: {
        valid: true,
        warnings: [],
      },
    });
    expect(buildPlan).toHaveBeenCalledOnce();
    expect(storePlan).toHaveBeenCalledOnce();
    expect(validatePlan).toHaveBeenCalledWith(VALID_PLAN_REF, 'mock');
    expect(markValid).toHaveBeenCalledWith(VALID_PLAN_REF);
    expect(markInvalid).not.toHaveBeenCalled();
  });

  it('returns compiled plan from compile route without persistence side effects', async () => {
    const reply = createReply();
    const plan = buildTransformationStoredPlan();
    const buildPlan = vi.fn(async () => ({
      plan,
      canonicalPlanJson: '{}',
    }));

    await compilePlanRoute(
      {
        id: 'req-compile-ok',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
          },
          selection: {
            selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
          },
          graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      {
        ...okAuthDeps(),
        planner: { buildPlan },
      } as never
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      plan,
      compile: {
        persisted: false,
        executabilityValidated: false,
      },
    });
    expect(buildPlan).toHaveBeenCalledOnce();
  });

  it('returns 400 when compile receives preview or legacy ingress fields', async () => {
    const reply = createReply();
    const buildPlan = vi.fn();

    await compilePlanRoute(
      {
        id: 'req-compile-forbidden-ingress',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
          },
          selection: {
            selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
          },
          manifestRef: {
            uri: 'file://manifest.json',
            sha256: 'a'.repeat(64),
          },
          graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
        },
      } as never,
      reply as never,
      {
        ...okAuthDeps(),
        planner: { buildPlan },
      } as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
    expect(buildPlan).not.toHaveBeenCalled();
  });

  it('returns 400 on import when planRef is invalid', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await importPlanRoute(
      {
        id: 'req-import-invalid',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          planRef: { uri: 'x' },
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });

  it('returns 422 when previewed plan is not executable for target adapter', async () => {
    const reply = createReply();
    const storePlan = vi.fn(async () => VALID_PLAN_REF);
    const markInvalid = vi.fn(async () => undefined);
    const deps = {
      ...okAuthDeps(),
      planner: {
        buildPlan: vi.fn(async () => ({
          plan: {
            metadata: {
              planId: VALID_PLAN_REF.planId,
              planVersion: VALID_PLAN_REF.planVersion,
              schemaVersion: VALID_PLAN_REF.schemaVersion,
              contractVersion: '1.0.0',
              inputHashSha256: VALID_PLAN_REF.sha256,
              createdAtIso: '2026-04-05T00:00:00.000Z',
            },
            steps: [],
          },
          canonicalPlanJson: '{}',
        })),
      },
      planStore: { storePlan, markValid: vi.fn(), markInvalid },
      planValidator: {
        validatePlan: vi.fn(async () => ({
          status: 'ERROR',
          code: 'REJECTED',
          adapterId: 'mock',
          planId: VALID_PLAN_REF.planId,
          degradable: false,
          reason: 'Adapter is not configured: mock',
          cause: 'adapter',
        })),
      },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-rejected',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(422);
    expect(markInvalid).toHaveBeenCalledWith(
      VALID_PLAN_REF,
      expect.objectContaining({ status: 'ERROR', code: 'REJECTED' })
    );
  });

  it('returns 400 when preview receives forbidden manifestRef input', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-manifest-rejected',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          manifestRef: {
            uri: 'file://manifest.json',
            sha256: 'f'.repeat(64),
          },
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
    expect(deps.planStore.storePlan).not.toHaveBeenCalled();
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('returns 400 when preview receives planRef without graphSource', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-plan-ref-invalid',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          planRef: VALID_PLAN_REF,
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('returns 400 when preview receives both planRef and graphSource', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-conflicting-sources',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          planRef: VALID_PLAN_REF,
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'conflicting_plan_inputs' },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('returns 422 when postgres transformation preview omits required provenance', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: {
        buildPlan: vi.fn(async () => ({
          plan: {
            metadata: {
              planId: VALID_PLAN_REF.planId,
              planVersion: VALID_PLAN_REF.planVersion,
              schemaVersion: VALID_PLAN_REF.schemaVersion,
              contractVersion: '1.0.0',
              inputHashSha256: VALID_PLAN_REF.sha256,
              createdAtIso: '2026-04-05T00:00:00.000Z',
            },
            steps: [
              {
                stepId: 'postgres-transform',
                kind: 'POSTGRES_SQL_TRANSFORM',
                dependsOn: [],
              },
            ],
          },
          canonicalPlanJson: '{}',
        })),
      },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-provenance-required',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual({
      error: {
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          cause: 'missing_preview_provenance',
          message: 'transformation-sql-first-v1 requires graphArtifact and sqlArtifact provenance.',
        },
      },
    });
    expect(deps.planStore.storePlan).not.toHaveBeenCalled();
    expect(deps.planValidator.validatePlan).not.toHaveBeenCalled();
  });

  it('returns 400 when previewProfile is missing', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-profile-missing',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_preview_profile',
        target: 'previewProfile',
      },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('returns 400 when transformation preview receives forbidden manifestRef input', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-profile-manifest-ref-rejected',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          selectedNodeIds: ['node_1'],
          manifestRef: {
            uri: 'file://manifest.json',
            sha256: 'f'.repeat(64),
          },
          provenance: VALID_PREVIEW_PROVENANCE,
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('returns 400 when previewProfile contains surrounding whitespace', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-profile-whitespace',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: ' planner-generic-v1 ',
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_preview_profile',
        target: 'previewProfile',
      },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('forwards preview provenance into planner observability extra payload', async () => {
    const reply = createReply();
    const plan = buildTransformationStoredPlan();
    const buildPlan = vi.fn(async () => ({
      plan,
      canonicalPlanJson: '{}',
    }));
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan },
      planStore: {
        storePlan: vi.fn(async () => VALID_PLAN_REF),
        markValid: vi.fn(async () => undefined),
        markInvalid: vi.fn(async () => undefined),
      },
      planValidator: {
        validatePlan: vi.fn(async () => ({
          status: 'OK',
          planId: VALID_PLAN_REF.planId,
          adapterId: 'mock',
        })),
      },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-provenance',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          selectedNodeIds: ['source-node', 'transform-node', 'sink-node'],
          graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
          provenance: VALID_PREVIEW_PROVENANCE,
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual(
      expect.objectContaining({
        previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
        plan,
        planRef: VALID_PLAN_REF,
        planSummary: {
          executor: 'postgres',
          nodeCount: 3,
          stepCount: 3,
          sourceTables: ['raw.orders'],
          sinkTables: ['analytics.orders_daily'],
        },
        persisted: {
          planRecordId: VALID_PLAN_REF.planId,
          canonicalPlanSha256: sha256HexUtf8(jcsCanonicalize(plan)),
        },
        validation: {
          valid: true,
          warnings: [],
        },
        provenance: VALID_PREVIEW_PROVENANCE,
      })
    );
    expect(buildPlan).toHaveBeenCalledOnce();
    expect(buildPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        observability: expect.objectContaining({
          extra: expect.objectContaining({
            transformationFlowRuntime: {
              previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
              executor: 'postgres',
            },
            transformationFlowProvenance: VALID_PREVIEW_PROVENANCE,
          }),
        }),
      })
    );
  });

  it('returns 400 when preview provenance payload is malformed', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: {
        buildPlan: vi.fn(async () => ({
          plan: {
            metadata: {
              planId: VALID_PLAN_REF.planId,
              planVersion: VALID_PLAN_REF.planVersion,
              schemaVersion: VALID_PLAN_REF.schemaVersion,
              contractVersion: '1.0.0',
              inputHashSha256: VALID_PLAN_REF.sha256,
              createdAtIso: '2026-04-05T00:00:00.000Z',
            },
            steps: [],
          },
          canonicalPlanJson: '{}',
        })),
      },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-provenance-invalid',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
          provenance: {
            graphArtifact: {
              repo: 'org/repo',
              ref: 'refs/heads/main',
              path: 'models/graph.yml',
              commitSha: 'commit-graph-1',
              contentSha256: 'not-a-sha256',
            },
            sqlArtifact: VALID_PREVIEW_PROVENANCE.sqlArtifact,
          },
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
    expect(deps.planStore.storePlan).not.toHaveBeenCalled();
  });

  it('returns 500 on preview when planner throws an unexpected error', async () => {
    const reply = createReply();
    const logError = vi.fn();
    const deps = {
      ...okAuthDeps(),
      planner: {
        buildPlan: vi.fn(async () => {
          throw new Error('unexpected planner failure');
        }),
      },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch: vi.fn() },
    };

    await previewPlanRoute(
      {
        id: 'req-preview-internal-error',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          previewProfile: PREVIEW_PROFILE_GENERIC,
          selectedNodeIds: ['node_1'],
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
        log: { error: logError },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({
      error: { type: 'internal_server_error', reason: 'internal_error' },
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('returns plan and planRef from import route', async () => {
    const reply = createReply();
    const fetch = vi.fn(async () => ({
      metadata: {
        planId: VALID_PLAN_REF.planId,
        planVersion: VALID_PLAN_REF.planVersion,
        schemaVersion: VALID_PLAN_REF.schemaVersion,
        contractVersion: '1.0.0',
        inputHashSha256: VALID_PLAN_REF.sha256,
        createdAtIso: '2026-04-05T00:00:00.000Z',
      },
      steps: [],
      observability: {
        tags: {
          'dvt.scope.tenantId': 'tenant-1',
          'dvt.scope.projectId': 'project-1',
          'dvt.scope.environmentId': 'env-1',
        },
      },
    }));
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: { fetch },
    };

    await importPlanRoute(
      {
        id: 'req-import-ok',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          planRef: VALID_PLAN_REF,
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      plan: {
        metadata: {
          planId: VALID_PLAN_REF.planId,
          planVersion: VALID_PLAN_REF.planVersion,
          schemaVersion: VALID_PLAN_REF.schemaVersion,
          contractVersion: '1.0.0',
          inputHashSha256: VALID_PLAN_REF.sha256,
          createdAtIso: '2026-04-05T00:00:00.000Z',
        },
        steps: [],
        observability: {
          tags: {
            'dvt.scope.tenantId': 'tenant-1',
            'dvt.scope.projectId': 'project-1',
            'dvt.scope.environmentId': 'env-1',
          },
        },
      },
      planRef: VALID_PLAN_REF,
    });
    expect(fetch).toHaveBeenCalledWith(VALID_PLAN_REF);
  });

  it('returns 403 on import when fetched plan scope tags do not match authorized context', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn(), markValid: vi.fn(), markInvalid: vi.fn() },
      planValidator: { validatePlan: vi.fn(async () => ({ status: 'OK' })) },
      planResolver: {
        fetch: vi.fn(async () => ({
          metadata: {
            planId: VALID_PLAN_REF.planId,
            planVersion: VALID_PLAN_REF.planVersion,
            schemaVersion: VALID_PLAN_REF.schemaVersion,
            contractVersion: '1.0.0',
            inputHashSha256: VALID_PLAN_REF.sha256,
            createdAtIso: '2026-04-05T00:00:00.000Z',
          },
          steps: [],
          observability: {
            tags: {
              'dvt.scope.tenantId': 'tenant-X',
              'dvt.scope.projectId': 'project-X',
              'dvt.scope.environmentId': 'env-X',
            },
          },
        })),
      },
    };

    await importPlanRoute(
      {
        id: 'req-import-forbidden',
        headers: { authorization: 'Bearer token' },
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'mock',
          },
          planRef: VALID_PLAN_REF,
        },
        log: { error: vi.fn() },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({
      error: {
        type: 'forbidden',
        reason: 'tenant_access_denied',
        details: { cause: 'plan_scope_mismatch' },
      },
    });
  });
});
