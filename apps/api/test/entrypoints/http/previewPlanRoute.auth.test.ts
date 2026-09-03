import { describe, expect, it, vi } from 'vitest';

import { previewPlanRoute } from '../../../src/entrypoints/http/previewPlanRoute.js';

import { VALID_DBT_GRAPH_SOURCE, VALID_PREVIEW_CONTEXT } from './planRouteFixtures.js';
import { createPreviewRequest, createReply } from './planRouteHttpTestSupport.js';
import { createPreviewDeps } from './previewPlanRouteTestSupport.js';

describe('previewPlanRoute auth', () => {
  it('returns 401 when bearer token is missing', async () => {
    const reply = createReply();
    const authorize = vi.fn();
    const deps = createPreviewDeps({
      authenticator: {
        authenticateBearerToken: vi.fn(async () => ({ ok: false, code: 'missing_bearer_token' })),
      },
      authorizer: { authorize },
    });

    await previewPlanRoute(
      createPreviewRequest({ id: 'req-preview-missing-token', authorization: null }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({
      error: { type: 'unauthorized', reason: 'missing_bearer_token' },
    });
    expect(authorize).not.toHaveBeenCalled();
  });

  it('authenticates before exposing semantic preview contract failures', async () => {
    const reply = createReply();
    const deps = createPreviewDeps({
      authenticator: {
        authenticateBearerToken: vi.fn(async () => ({ ok: false, code: 'missing_bearer_token' })),
      },
    });

    await previewPlanRoute(
      createPreviewRequest({
        id: 'req-preview-invalid-contract-missing-token',
        authorization: null,
        body: {
          context: VALID_PREVIEW_CONTEXT,
          previewProfile: 'retired-preview-profile',
          selection: { mode: 'explicit', nodeIds: ['node_1'] },
          graphSource: VALID_DBT_GRAPH_SOURCE,
          persist: true,
        },
      }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({
      error: { type: 'unauthorized', reason: 'missing_bearer_token' },
    });
    expect(deps.authorizer.authorize).not.toHaveBeenCalled();
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });

  it('returns 403 when principal is not granted run:start', async () => {
    const reply = createReply();
    const deps = createPreviewDeps({
      authorizer: {
        authorize: vi.fn(async () => ({ ok: false, reason: 'action_not_granted' })),
      },
    });

    await previewPlanRoute(
      createPreviewRequest({ id: 'req-preview-forbidden' }) as never,
      reply as never,
      deps as never
    );

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({
      error: { type: 'forbidden', reason: 'action_not_granted' },
    });
    expect(deps.planner.buildPlan).not.toHaveBeenCalled();
  });
});
