import { describe, expect, it, vi } from 'vitest';

import { previewPlanRoute } from '../../../src/entrypoints/http/previewPlanRoute.js';

import {
  PREVIEW_PROFILE_GENERIC,
  VALID_PLAN_REF,
  VALID_PREVIEW_CONTEXT,
  buildPreviewBody,
} from './planRouteFixtures.js';
import { createPreviewRequest, createReply } from './planRouteHttpTestSupport.js';
import { createPreviewDeps } from './previewPlanRouteTestSupport.js';

describe('previewPlanRoute input policy', () => {
  it('returns 400 when body.context is missing', async () => {
    const reply = createReply();

    await previewPlanRoute(
      createPreviewRequest({
        id: 'req-preview-invalid',
        body: {
          selection: { mode: 'explicit', nodeIds: ['node_1'] },
        },
      }) as never,
      reply as never,
      createPreviewDeps() as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: { type: 'bad_request', reason: 'invalid_body' } });
  });

  it('rejects preview requests that omit the canonical persistence intent', async () => {
    const reply = createReply();
    const deps = createPreviewDeps();
    const { persist: _persist, ...body } = buildPreviewBody();

    await previewPlanRoute(
      createPreviewRequest({ id: 'req-preview-missing-persist', body }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: 'invalid_body' },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
    expect(deps.planStore.storePlanArtifact).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'generic preview receives forbidden manifestRef input',
      body: buildPreviewBody({
        manifestRef: { uri: 'file://manifest.json', sha256: 'f'.repeat(64) },
      }),
    },
    {
      name: 'preview receives planRef without graphSource',
      body: {
        context: VALID_PREVIEW_CONTEXT,
        previewProfile: PREVIEW_PROFILE_GENERIC,
        selection: { mode: 'explicit', nodeIds: ['node_1'] },
        planRef: VALID_PLAN_REF,
      },
    },
    {
      name: 'preview receives both planRef and graphSource',
      body: buildPreviewBody({ planRef: VALID_PLAN_REF }),
      expectedReason: 'conflicting_plan_inputs',
    },
  ])('returns 400 when $name', async ({ body, expectedReason = 'invalid_plan_source' }) => {
    const reply = createReply();
    const deps = createPreviewDeps();

    await previewPlanRoute(createPreviewRequest({ body }) as never, reply as never, deps as never);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: { type: 'bad_request', reason: expectedReason },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
    expect(deps.planStore.storePlanArtifact).not.toHaveBeenCalled();
  });

  it('accepts protected DVT provenance without browser graph semantics', async () => {
    const reply = createReply();
    const rejection = {
      code: 'REJECTED' as const,
      cause: 'dvt_preview_target_projection_failed',
      reason: 'Projection unavailable in this fixture.',
    };
    const execute = vi.fn(async () => ({ ok: false as const, rejection }));
    const deps = createPreviewDeps({
      previewSelectionResolver: { execute },
    });
    const base = buildPreviewBody({
      selection: { mode: 'upstream', nodeIds: ['transform-a'] },
      provenance: {
        kind: 'dvt-protected-workspace-graph',
        canvasId: 'canvas-a',
      },
    });
    const { graphSource: _graphSource, ...body } = base;

    await previewPlanRoute(
      createPreviewRequest({ id: 'req-preview-dvt', body }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(422);
    expect(execute).toHaveBeenCalledWith(
      {
        selection: { mode: 'upstream', nodeIds: ['transform-a'] },
        provenance: {
          kind: 'dvt-protected-workspace-graph',
          canvasId: 'canvas-a',
        },
      },
      expect.objectContaining({
        scope: expect.objectContaining({
          projectId: expect.anything(),
        }),
      })
    );
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
    expect(deps.planStore.storePlanArtifact).not.toHaveBeenCalled();
  });
  it('returns 400 when previewProfile is missing or padded with whitespace', async () => {
    for (const body of [
      {
        context: VALID_PREVIEW_CONTEXT,
        selection: { mode: 'explicit', nodeIds: ['node_1'] },
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
      },
      buildPreviewBody({ previewProfile: ' planner-generic-v1 ' }),
    ]) {
      const reply = createReply();
      const deps = createPreviewDeps();

      await previewPlanRoute(
        createPreviewRequest({ body }) as never,
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
    }
  });
});
