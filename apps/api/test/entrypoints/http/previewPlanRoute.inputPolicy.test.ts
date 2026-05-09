import { type PlannerBuildResultV1 } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { previewPlanRoute } from '../../../src/entrypoints/http/previewPlanRoute.js';

import {
  PREVIEW_PROFILE_GENERIC,
  PREVIEW_PROFILE_TRANSFORMATION,
  VALID_PLAN_REF,
  VALID_PREVIEW_CONTEXT,
  VALID_PREVIEW_PROVENANCE,
  VALID_TRANSFORMATION_GRAPH_SOURCE,
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
    {
      name: 'transformation preview receives forbidden manifestRef input',
      body: {
        context: VALID_PREVIEW_CONTEXT,
        previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
        selection: { mode: 'explicit', nodeIds: ['node_1'] },
        manifestRef: { uri: 'file://manifest.json', sha256: 'f'.repeat(64) },
        provenance: VALID_PREVIEW_PROVENANCE,
      },
    },
    {
      name: 'preview provenance payload is malformed',
      body: {
        context: VALID_PREVIEW_CONTEXT,
        previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
        selection: { mode: 'explicit', nodeIds: ['node_1'] },
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

  it('returns 422 when postgres transformation preview omits required provenance', async () => {
    const reply = createReply();
    const plannerBuildResult: PlannerBuildResultV1 = {
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
      executionPolicy: {},
      canonicalPlanCoreJson: '{}',
    };
    const deps = createPreviewDeps({
      planner: {
        buildPlan: vi.fn(async () => plannerBuildResult),
      },
    });

    await previewPlanRoute(
      createPreviewRequest({
        id: 'req-preview-provenance-required',
        body: {
          context: VALID_PREVIEW_CONTEXT,
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          selection: { mode: 'explicit', nodeIds: ['node_1'] },
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
      }) as never,
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
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          requiredArtifacts: ['graphArtifact', 'sqlArtifact'],
        },
      },
    });
    expect(deps.planStore.storePlanArtifact).not.toHaveBeenCalled();
    expect(deps.planValidator.validatePlan).not.toHaveBeenCalled();
  });

  it('returns stable contract issue details when transformation preview uses the wrong graph family', async () => {
    const reply = createReply();
    const deps = createPreviewDeps();

    await previewPlanRoute(
      createPreviewRequest({
        id: 'req-preview-contract-issues',
        body: buildPreviewBody({
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          selection: { mode: 'explicit', nodeIds: ['source-node', 'transform-node', 'sink-node'] },
          graphSource: {
            ...VALID_TRANSFORMATION_GRAPH_SOURCE,
            sourceFamily: 'dbt',
          },
          provenance: VALID_PREVIEW_PROVENANCE,
        }),
      }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_plan_source',
        details: {
          cause: 'preview_contract_validation_failed',
          previewProfile: PREVIEW_PROFILE_TRANSFORMATION,
          issues: [{ path: 'graphSource.sourceFamily', code: 'custom' }],
        },
      },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
    expect(deps.planStore.storePlanArtifact).not.toHaveBeenCalled();
  });
});
