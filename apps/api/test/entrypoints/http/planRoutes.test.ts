import { describe, expect, it, vi } from 'vitest';

import { importPlanRoute, previewPlanRoute } from '../../../src/entrypoints/http/planRoutes.js';

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

function okAuthDeps() {
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

describe('planRoutes', () => {
  it('returns 400 on preview when body.context is missing', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn() },
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

  it('returns plan and planRef from preview route', async () => {
    const reply = createReply();
    const buildPlan = vi.fn(async () => ({
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
    }));
    const storePlan = vi.fn(async () => VALID_PLAN_REF);
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan },
      planStore: { storePlan },
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
      planRef: VALID_PLAN_REF,
    });
    expect(buildPlan).toHaveBeenCalledOnce();
    expect(storePlan).toHaveBeenCalledOnce();
  });

  it('returns 400 on import when planRef is invalid', async () => {
    const reply = createReply();
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn() },
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
    }));
    const deps = {
      ...okAuthDeps(),
      planner: { buildPlan: vi.fn() },
      planStore: { storePlan: vi.fn() },
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
      },
      planRef: VALID_PLAN_REF,
    });
    expect(fetch).toHaveBeenCalledWith(VALID_PLAN_REF);
  });
});
