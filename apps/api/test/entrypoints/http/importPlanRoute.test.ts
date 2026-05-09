import { describe, expect, it, vi } from 'vitest';

import { ImportPlanUseCase } from '../../../src/application/services/ImportPlanUseCase.js';
import { importPlanRoute } from '../../../src/entrypoints/http/importPlanRoute.js';

import { VALID_PLAN_REF, buildImportedPlan } from './planRouteFixtures.js';
import {
  createImportRequest,
  createReply,
  okAuthDeps,
  type TestAuthDeps,
} from './planRouteHttpTestSupport.js';

const SCOPED_VALID_PLAN_REF = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  planRef: VALID_PLAN_REF,
};

type ImportRouteTestDeps = TestAuthDeps & {
  planResolver: { fetch: ReturnType<typeof vi.fn> };
  useCase: Pick<ImportPlanUseCase, 'execute'>;
};

function createImportDeps(
  overrides: Partial<Omit<ImportRouteTestDeps, 'useCase' | 'planResolver'>> & {
    planResolver?: Partial<ImportRouteTestDeps['planResolver']>;
  } = {}
): ImportRouteTestDeps {
  const planResolver = {
    fetch: vi.fn(),
    ...overrides.planResolver,
  };

  return {
    ...okAuthDeps(),
    ...overrides,
    planResolver,
    useCase: new ImportPlanUseCase({ planResolver }),
  };
}

describe('importPlanRoute', () => {
  it('returns 400 when planRef is invalid', async () => {
    const reply = createReply();

    await importPlanRoute(
      createImportRequest({
        id: 'req-import-invalid',
        body: {
          context: {
            runId: 'run_1',
            tenantId: 'tenant-1',
            projectId: 'project-1',
            environmentId: 'env-1',
            targetAdapter: 'temporal',
          },
          planRef: { uri: 'x' },
        },
      }) as never,
      reply as never,
      createImportDeps() as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });

  it('returns the stored plan when the authorized scope matches', async () => {
    const reply = createReply();
    const plan = buildImportedPlan({
      ownership: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
      },
      scopeTags: {
        'dvt.scope.tenantId': 'tenant-X',
        'dvt.scope.projectId': 'project-X',
        'dvt.scope.environmentId': 'env-X',
      },
    });
    const fetch = vi.fn(async () => plan);

    await importPlanRoute(
      createImportRequest({ id: 'req-import-ok' }) as never,
      reply as never,
      createImportDeps({ planResolver: { fetch } }) as never
    );

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      plan,
      planRef: VALID_PLAN_REF,
    });
    expect(fetch).toHaveBeenCalledWith(SCOPED_VALID_PLAN_REF);
  });

  it('returns 403 when canonical ownership mismatches even if scope tags match the authorized context', async () => {
    const reply = createReply();

    await importPlanRoute(
      createImportRequest({ id: 'req-import-forbidden' }) as never,
      reply as never,
      createImportDeps({
        planResolver: {
          fetch: vi.fn(async () =>
            buildImportedPlan({
              ownership: {
                tenantId: 'tenant-X',
                projectId: 'project-X',
                environmentId: 'env-X',
              },
              scopeTags: {
                'dvt.scope.tenantId': 'tenant-1',
                'dvt.scope.projectId': 'project-1',
                'dvt.scope.environmentId': 'env-1',
              },
            })
          ),
        },
      }) as never
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

  it('returns 403 when fetched plan scope ownership does not match the authorized context', async () => {
    const reply = createReply();

    await importPlanRoute(
      createImportRequest({ id: 'req-import-forbidden-metadata' }) as never,
      reply as never,
      createImportDeps({
        planResolver: {
          fetch: vi.fn(async () =>
            buildImportedPlan({
              ownership: {
                tenantId: 'tenant-X',
                projectId: 'project-X',
                environmentId: 'env-X',
              },
            })
          ),
        },
      }) as never
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
