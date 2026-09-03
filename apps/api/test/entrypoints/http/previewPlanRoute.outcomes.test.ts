import { describe, expect, it, vi } from 'vitest';

import { previewPlanRoute } from '../../../src/entrypoints/http/previewPlanRoute.js';

import {
  PREVIEW_PROFILE_GENERIC,
  VALID_PLAN_REF,
  buildPreviewBody,
  buildStoredPlan,
} from './planRouteFixtures.js';
import { createPreviewRequest, createReply } from './planRouteHttpTestSupport.js';
import { createPreviewDeps } from './previewPlanRouteTestSupport.js';

const SCOPED_VALID_PLAN_REF = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  planRef: VALID_PLAN_REF,
};

function createAcceptedPreviewDeps(
  buildPlan: ReturnType<typeof vi.fn>
): ReturnType<typeof createPreviewDeps> {
  return createPreviewDeps({
    planner: { buildPlan },
    planStore: {
      storePlanArtifact: vi.fn(async () => VALID_PLAN_REF),
      markStoredPlanArtifactValid: vi.fn(async () => undefined),
      markStoredPlanArtifactInvalid: vi.fn(async () => undefined),
    },
    planValidator: {
      materializeAndValidatePlan: vi.fn(async () => {
        const storedBuild = buildPlan.mock.results.at(-1);
        if (storedBuild === undefined) throw new Error('Expected a stored planner result');
        return {
          accepted: true,
          materialized: {
            plan: (await storedBuild.value).plan,
            executionPolicy: {},
          },
          validation: {
            status: 'OK',
            planId: VALID_PLAN_REF.planId,
            adapterId: 'temporal',
          },
        };
      }),
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
    const materializeAndValidatePlan = deps.planValidator.materializeAndValidatePlan;

    await executePreviewRequest(reply, deps, { id: 'req-preview-ok' });

    expect(reply.statusCode).toBe(200);
    expect(reply.payload).toEqual({
      previewProfile: PREVIEW_PROFILE_GENERIC,
      plan,
      planRef: VALID_PLAN_REF,
      persisted: {
        planRecordId: VALID_PLAN_REF.planId,
        canonicalPlanSha256: 'c'.repeat(64),
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
    expect(materializeAndValidatePlan).toHaveBeenCalledWith({
      ...SCOPED_VALID_PLAN_REF,
      adapterId: 'temporal',
    });
    expect(deps.planStore.storePlanArtifact).toHaveBeenCalledTimes(1);
    expect(materializeAndValidatePlan).toHaveBeenCalledTimes(1);
    expect(deps.planStore.markStoredPlanArtifactValid).toHaveBeenCalledWith(SCOPED_VALID_PLAN_REF);
    expect(deps.planStore.markStoredPlanArtifactInvalid).not.toHaveBeenCalled();
  });

  it('reuses an already valid stored plan without issuing a duplicate validation transition', async () => {
    const reply = createReply();
    const plan = buildStoredPlan();
    const buildPlan = vi.fn(async () => ({
      plan,
      executionPolicy: {},
      canonicalPlanCoreJson: '{}',
    }));
    const deps = createPreviewDeps({
      planner: { buildPlan },
      planStore: {
        storePlanArtifact: vi.fn(async () => VALID_PLAN_REF),
        markStoredPlanArtifactValid: vi.fn(async () => undefined),
        markStoredPlanArtifactInvalid: vi.fn(async () => undefined),
        getStoredPlanValidationRecord: vi.fn(async () => ({
          planId: VALID_PLAN_REF.planId,
          state: 'VALID',
          storedAtIso: '2026-05-26T00:00:00.000Z',
          updatedAtIso: '2026-05-26T00:00:00.000Z',
        })),
      },
      planValidator: {
        materializeAndValidatePlan: vi.fn(async () => ({
          accepted: true,
          materialized: { plan, executionPolicy: {} },
          validation: {
            status: 'OK',
            planId: VALID_PLAN_REF.planId,
            adapterId: 'temporal',
          },
        })),
      },
    });

    await executePreviewRequest(reply, deps, { id: 'req-preview-valid-reuse' });

    expect(reply.statusCode).toBe(200);
    expect(deps.planStore.getStoredPlanValidationRecord).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      planId: VALID_PLAN_REF.planId,
    });
    expect(deps.planStore.markStoredPlanArtifactValid).not.toHaveBeenCalled();
  });

  it('returns 422 and marks the stored plan invalid when executability fails', async () => {
    const reply = createReply();
    const plan = buildStoredPlan();
    const validation = {
      status: 'ERROR' as const,
      code: 'REJECTED' as const,
      adapterId: 'temporal',
      planId: VALID_PLAN_REF.planId,
      degradable: false,
      reason: 'Adapter is not configured: temporal',
      cause: 'adapter',
    };
    const deps = createPreviewDeps({
      planner: {
        buildPlan: vi.fn(async () => ({
          plan,
          executionPolicy: {},
          canonicalPlanCoreJson: '{}',
        })),
      },
      planStore: {
        storePlanArtifact: vi.fn(async () => VALID_PLAN_REF),
        markStoredPlanArtifactValid: vi.fn(),
        markStoredPlanArtifactInvalid: vi.fn(async () => undefined),
      },
      planValidator: {
        materializeAndValidatePlan: vi.fn(async () => ({
          accepted: false,
          materialized: { plan, executionPolicy: {} },
          validation,
        })),
      },
    });

    await previewPlanRoute(
      createPreviewRequest({ id: 'req-preview-rejected' }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual({
      error: {
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          contractVersion: '1.0.0',
          kind: 'plan-invalid',
          previewProfile: PREVIEW_PROFILE_GENERIC,
          plan,
          planRef: VALID_PLAN_REF,
          persisted: {
            planRecordId: VALID_PLAN_REF.planId,
            canonicalPlanSha256: 'c'.repeat(64),
          },
          validation,
        },
      },
    });
    expect(deps.planStore.markStoredPlanArtifactInvalid).toHaveBeenCalledWith({
      ...SCOPED_VALID_PLAN_REF,
      report: expect.objectContaining({ status: 'ERROR', code: 'REJECTED' }),
    });
  });

  it('returns typed selection-rejected without building or storing a plan', async () => {
    const reply = createReply();
    const rejection = {
      code: 'REJECTED' as const,
      cause: 'dependency_gap',
      reason: 'Selected closure is missing required dependencies.',
    };
    const deps = createPreviewDeps({
      previewSelectionResolver: {
        execute: vi.fn(async () => ({ ok: false as const, rejection })),
      },
    });

    await executePreviewRequest(reply, deps, { id: 'req-preview-selection-rejected' });

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual({
      error: {
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          contractVersion: '1.0.0',
          kind: 'selection-rejected',
          rejection,
        },
      },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
    expect(deps.planStore.storePlanArtifact).not.toHaveBeenCalled();
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
