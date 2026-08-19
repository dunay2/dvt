import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerGraphDbtModelCompilationRoutes } from '../../../src/entrypoints/http/graphDbtModelCompilationRoutes.js';

const SCOPE_QUERY = 'tenantId=tenant-a&projectId=project-a&environmentId=env-a';

describe('graphDbtModelCompilationRoutes', () => {
  it('authorizes graph and file reads before compiling selected models', async () => {
    const execute = vi.fn().mockResolvedValue({
      schemaVersion: 'graph-dbt-model-compilation.v1',
      kind: 'authority_refused',
      canvasId: 'canvas-dbt',
      reason: 'missing_authority',
    });
    const authorize = vi.fn().mockImplementation((_principal, requestedScope) => ({
      ok: true,
      context: {
        principal: principal(),
        scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
        action: requestedScope.action,
        requestId: 'req-1',
        authorizedAt: new Date('2026-08-19T00:00:00Z'),
      },
    }));
    const app = Fastify({ logger: false });
    registerGraphDbtModelCompilationRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: { authorize } as never,
      query: { execute },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/compiled-models?${SCOPE_QUERY}`,
      payload: { canvasId: 'canvas-dbt', selectors: ['orders'] },
    });

    expect(response.statusCode).toBe(200);
    expect(authorize.mock.calls.map(([, requestedScope]) => requestedScope.action)).toEqual([
      { kind: 'query', name: 'workspace:graph-draft:view' },
      { kind: 'query', name: 'workspace:files:view' },
    ]);
    expect(execute).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      canvasId: 'canvas-dbt',
      selectors: ['orders'],
    });
  });

  it('rejects unsafe selectors before authentication or compilation', async () => {
    const execute = vi.fn();
    const authenticateBearerToken = vi.fn();
    const app = Fastify({ logger: false });
    registerGraphDbtModelCompilationRoutes(app, {
      authenticator: { authenticateBearerToken } as never,
      authorizer: {} as never,
      query: { execute },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/compiled-models?${SCOPE_QUERY}`,
      payload: { canvasId: 'canvas-dbt', selectors: ['orders; drop table users'] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        type: 'bad_request',
        reason: 'invalid_graph_dbt_model_compilation_request',
        target: 'body',
      },
    });
    expect(authenticateBearerToken).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not compile when workspace file read access is denied', async () => {
    const execute = vi.fn();
    const app = Fastify({ logger: false });
    registerGraphDbtModelCompilationRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: {
        authorize: vi.fn().mockImplementation((_principal, requestedScope) =>
          requestedScope.action.name === 'workspace:graph-draft:view'
            ? {
                ok: true,
                context: {
                  principal: principal(),
                  scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
                  action: requestedScope.action,
                  requestId: 'req-1',
                  authorizedAt: new Date('2026-08-19T00:00:00Z'),
                },
              }
            : { ok: false, reason: 'ACTION_NOT_GRANTED' }
        ),
      } as never,
      query: { execute },
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'POST',
      url: `/workspace/dbt/graph-artifacts/compiled-models?${SCOPE_QUERY}`,
      payload: { canvasId: 'canvas-dbt', selectors: ['orders'] },
    });

    expect(response.statusCode).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
});

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
