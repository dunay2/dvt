import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerCanvasTransformDataSampleRoutes } from '../../../src/entrypoints/http/canvasTransformDataSampleRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

function principal(): Record<string, unknown> {
  return {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
  };
}

function buildApp(): Readonly<{
  app: FastifyInstance;
  execute: ReturnType<typeof vi.fn>;
  authorize: ReturnType<typeof vi.fn>;
}> {
  const execute = vi.fn(async () => ({
    contractVersion: 1 as const,
    canvasId: 'canvas-orders',
    transformNodeId: 'transform-orders',
    draftRevision: 'revision-7',
    semanticPlanSha256: 'a'.repeat(64),
    columns: [{ name: 'order_id', type: 'integer', nullable: true }],
    rows: [{ values: ['1'] }],
    limit: 20,
    truncated: false,
    sampledAt: '2026-09-15T10:00:00.000Z',
  }));
  const authorize = vi.fn(async (_principal, requestedScope) => ({
    ok: true as const,
    context: {
      principal: principal(),
      scope: requestedScope,
      action: requestedScope.action,
      requestId: 'req-1',
      authorizedAt: new Date('2026-09-15T00:00:00.000Z'),
    },
  }));
  const app = Fastify({ logger: false });
  registerCanvasTransformDataSampleRoutes(app, {
    authenticator: {
      authenticateBearerToken: vi.fn(async () => ({ ok: true as const, principal: principal() })),
    } as never,
    authorizer: { authorize } as never,
    query: { execute } as never,
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return { app, execute, authorize };
}

describe('canvasTransformDataSampleRoutes', () => {
  it('authorizes and returns one bounded Transform sample', async () => {
    const { app, execute, authorize } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/graph/canvases/canvas-orders/transforms/transform-orders/data-sample?${SCOPE_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      canvasId: 'canvas-orders',
      transformNodeId: 'transform-orders',
      rows: [{ values: ['1'] }],
    });
    expect(authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'query', name: 'workspace:graph-draft:view' },
      }),
      expect.any(String)
    );
    expect(execute).toHaveBeenCalledWith(
      { canvasId: 'canvas-orders', transformNodeId: 'transform-orders', limit: 20 },
      expect.anything()
    );
  });

  it('rejects an excessive limit before authorization or execution', async () => {
    const { app, execute, authorize } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/graph/canvases/canvas-orders/transforms/transform-orders/data-sample?${SCOPE_QUERY}&limit=51`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_transform_data_sample_request',
        target: 'query',
      },
    });
    expect(authorize).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
