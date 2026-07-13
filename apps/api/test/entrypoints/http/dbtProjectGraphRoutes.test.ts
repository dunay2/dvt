import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerDbtProjectGraphRoutes } from '../../../src/entrypoints/http/dbtProjectGraphRoutes.js';

const VALID_QUERY =
  'tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId=canvas-orders&projectRoot=analytics';

describe('dbtProjectGraphRoutes', () => {
  it('authorizes and returns the scoped file-backed dbt projection', async () => {
    const execute = vi.fn().mockResolvedValue(projection());
    const authenticateBearerToken = vi.fn().mockResolvedValue({ ok: true, principal: principal() });
    const authorize = vi.fn().mockImplementation((_principal, requestedScope) => ({
      ok: true,
      context: {
        principal: principal(),
        scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
        action: requestedScope.action,
        requestId: 'req-1',
        authorizedAt: new Date('2026-07-13T00:00:00Z'),
      },
    }));
    const app = Fastify({ logger: false });
    registerDbtProjectGraphRoutes(app, {
      authenticator: { authenticateBearerToken } as never,
      authorizer: { authorize } as never,
      useCase: { execute } as never,
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(projection());
    expect(authenticateBearerToken).toHaveBeenCalledTimes(1);
    expect(authorize.mock.calls.map(([, requestedScope]) => requestedScope.action)).toEqual([
      { kind: 'query', name: 'workspace:graph-draft:view' },
      { kind: 'query', name: 'workspace:files:view' },
    ]);
    expect(execute).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      authorityBinding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'canvas-orders',
        authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
      },
    });
  });

  it('denies analysis when the caller cannot read workspace files', async () => {
    const execute = vi.fn();
    const authenticateBearerToken = vi.fn().mockResolvedValue({ ok: true, principal: principal() });
    const authorize = vi.fn().mockImplementation((_principal, requestedScope) =>
      requestedScope.action.name === 'workspace:graph-draft:view'
        ? {
            ok: true,
            context: {
              principal: principal(),
              scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
              action: requestedScope.action,
              requestId: 'req-1',
              authorizedAt: new Date('2026-07-13T00:00:00Z'),
            },
          }
        : { ok: false, reason: 'ACTION_NOT_GRANTED' }
    );
    const app = Fastify({ logger: false });
    registerDbtProjectGraphRoutes(app, {
      authenticator: { authenticateBearerToken } as never,
      authorizer: { authorize } as never,
      useCase: { execute } as never,
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(403);
    expect(authenticateBearerToken).toHaveBeenCalledTimes(1);
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    [
      'missing canvas',
      'tenantId=tenant-a&projectId=project-a&environmentId=env-a&projectRoot=analytics',
    ],
    [
      'unsafe project root',
      'tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId=canvas-orders&projectRoot=..%2Fanalytics',
    ],
  ])('rejects %s before invoking the use case', async (_label, query) => {
    const execute = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtProjectGraphRoutes(app, {
      authenticator: {} as never,
      authorizer: {} as never,
      useCase: { execute } as never,
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({ method: 'GET', url: `/workspace/dbt/graph?${query}` });

    expect(response.statusCode).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not analyze a project without an authenticated bearer session', async () => {
    const execute = vi.fn();
    const app = Fastify({ logger: false });
    registerDbtProjectGraphRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: false, code: 'missing_token' }),
      } as never,
      authorizer: {} as never,
      useCase: { execute } as never,
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });
});

function projection(): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    schemaVersion: 'dbt-project-graph-projection.v1',
    authorityBinding: {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-orders',
      authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
    },
    freshness: 'fresh',
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256: 'a'.repeat(64),
      analyzedAt: '2026-07-13T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v1',
      dbtVersion: '1.10.0',
    },
    analysisSha256: 'b'.repeat(64),
    nodes: [],
    edges: [],
    diagnostics: [],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 0 },
  });
}

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
