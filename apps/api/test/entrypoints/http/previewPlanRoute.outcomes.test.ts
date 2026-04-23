import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { previewPlanRoute } from '../../../src/entrypoints/http/previewPlanRoute.js';

import {
  PREVIEW_PROFILE_GENERIC,
  PREVIEW_PROFILE_TRANSFORMATION,
  VALID_PLAN_REF,
  VALID_PREVIEW_PROVENANCE,
  VALID_TRANSFORMATION_GRAPH_SOURCE,
  buildPreviewBody,
  buildStoredPlan,
  buildTransformationStoredPlan,
} from './planRouteFixtures.js';
import {
  createPreviewRequest,
  createReply,
} from './planRouteHttpTestSupport.js';
import { createPreviewDeps } from './previewPlanRouteTestSupport.js';

function createAcceptedPreviewDeps(
  buildPlan: ReturnType<typeof vi.fn>
): ReturnType<typeof createPreviewDeps> {
  return createPreviewDeps({
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
  });
}

async function executePreviewRequest(
  reply: ReturnType<typeof createReply>,
  deps: ReturnType<typeof createPreviewDeps>,
  request: Parameters<typeof createPreviewRequest>[0]
): Promise<void> {
  await previewPlanRoute(createPreviewRequest(request) as never, reply as never, deps as never);
}

function expectTransformationPreviewPlannerObservability(
  buildPlan: ReturnType<typeof vi.fn>
): void {
  expect(buildPlan).toHaveBeenCalledWith(
    expect.objectContaining({
      ownership: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
      },
      observability: expect.objectContaining({
        tags: {
          'dvt.scope.tenantId': 'tenant-1',
          'dvt.scope.projectId': 'project-1',
          'dvt.scope.environmentId': 'env-1',
        },
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
}

describe('previewPlanRoute outcomes', () => {
  it('returns plan and planRef for a generic preview', async () => {
    const reply = createReply();
    const plan = buildStoredPlan();
    const buildPlan = vi.fn(async () => ({
      plan,
      executionPolicy: {},
      canonicalPlanCoreJson: '{}',
    }));
    const deps = createAcceptedPreviewDeps(buildPlan);
    const validatePlan = deps.planValidator.validatePlan;

    await executePreviewRequest(reply, deps, { id: 'req-preview-ok' });

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      previewProfile: PREVIEW_PROFILE_GENERIC,
      plan,
      planRef: VALID_PLAN_REF,
      persisted: {
        planRecordId: VALID_PLAN_REF.planId,
        canonicalPlanSha256: sha256HexUtf8(jcsCanonicalize(plan)),
      },
      validation: { valid: true, warnings: [] },
    });
    expect(buildPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        ownership: {
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'env-1',
        },
      })
    );
    expect(validatePlan).toHaveBeenCalledWith(VALID_PLAN_REF, 'mock');
    expect(deps.planStore.markValid).toHaveBeenCalledWith(VALID_PLAN_REF);
    expect(deps.planStore.markInvalid).not.toHaveBeenCalled();
  });

  it('returns 422 and marks the stored plan invalid when executability fails', async () => {
    const reply = createReply();
    const deps = createPreviewDeps({
      planner: {
        buildPlan: vi.fn(async () => ({
          plan: buildStoredPlan(),
          executionPolicy: {},
          canonicalPlanCoreJson: '{}',
        })),
      },
      planStore: {
        storePlan: vi.fn(async () => VALID_PLAN_REF),
        markValid: vi.fn(),
        markInvalid: vi.fn(async () => undefined),
      },
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
    });

    await previewPlanRoute(
      createPreviewRequest({ id: 'req-preview-rejected' }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(422);
    expect(deps.planStore.markInvalid).toHaveBeenCalledWith(
      VALID_PLAN_REF,
      expect.objectContaining({ status: 'ERROR', code: 'REJECTED' })
    );
  });

  it('forwards transformation provenance into planner observability and response payload', async () => {
    const reply = createReply();
    const plan = buildTransformationStoredPlan();
    const buildPlan = vi.fn(async () => ({
      plan,
      executionPolicy: {},
      canonicalPlanCoreJson: '{}',
    }));
    const deps = createAcceptedPreviewDeps(buildPlan);

    await executePreviewRequest(reply, deps, {
      id: 'req-preview-provenance',
      body: buildPreviewBody({
        previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
        selection: {
          mode: 'explicit',
          nodeIds: ['source-node', 'transform-node', 'sink-node'],
        },
        graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
        provenance: VALID_PREVIEW_PROVENANCE,
      }),
    });

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
        provenance: VALID_PREVIEW_PROVENANCE,
      })
    );
    expectTransformationPreviewPlannerObservability(buildPlan);
  });

  it('returns 500 when the planner throws an unexpected error', async () => {
    const reply = createReply();
    const logError = vi.fn();
    const deps = createPreviewDeps({
      planner: {
        buildPlan: vi.fn(async () => {
          throw new Error('unexpected planner failure');
        }),
      },
    });

    await previewPlanRoute(
      createPreviewRequest({
        id: 'req-preview-internal-error',
        body: buildPreviewBody(),
        logError,
      }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({
      error: { type: 'internal_server_error', reason: 'internal_error' },
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
