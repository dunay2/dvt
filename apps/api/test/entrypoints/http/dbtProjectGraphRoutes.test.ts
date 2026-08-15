import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { DbtProjectFileAuthorityRequiredError } from '../../../src/application/ports/dbtProjectImport.js';
import { registerDbtProjectGraphRoutes } from '../../../src/entrypoints/http/dbtProjectGraphRoutes.js';

const VALID_QUERY =
  'tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId=canvas-orders';

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
      canvasId: 'canvas-orders',
      includeGovernedSourceIdentity: false,
    });
  });

  it('preserves the legacy v1 wire shape when no projection feature is negotiated', async () => {
    const execute = vi.fn().mockResolvedValue(projectionWithSourceIdentity());
    const app = buildAuthorizedApp(execute);

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().nodes).toEqual([
      expect.not.objectContaining({
        identifier: expect.anything(),
        sourceIdentity: expect.anything(),
      }),
    ]);
  });

  it('returns governed source identity only when the feature is explicitly negotiated', async () => {
    const expandedProjection = projectionWithSourceIdentity();
    const execute = vi.fn().mockResolvedValue(expandedProjection);
    const app = buildAuthorizedApp(execute);

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}&projectionFeature=governed-source-identity.v1`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expandedProjection);
    expect(execute).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      canvasId: 'canvas-orders',
      includeGovernedSourceIdentity: true,
    });
  });

  it('rejects unknown projection features before invoking the query', async () => {
    const execute = vi.fn();
    const app = buildAuthorizedApp(execute);

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}&projectionFeature=unknown-feature`,
    });

    expect(response.statusCode).toBe(400);
    expect(execute).not.toHaveBeenCalled();
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
    ['missing canvas', 'tenantId=tenant-a&projectId=project-a&environmentId=env-a'],
    ['invalid canvas', 'tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId='],
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

  it('ignores caller project-root input and resolves file authority inside the use case', async () => {
    const execute = vi.fn().mockResolvedValue(projection());
    const app = Fastify({ logger: false });
    registerDbtProjectGraphRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: {
        authorize: vi.fn().mockImplementation((_principal, requestedScope) => ({
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: requestedScope.action,
            requestId: 'req-1',
            authorizedAt: new Date('2026-07-13T00:00:00Z'),
          },
        })),
      } as never,
      useCase: { execute } as never,
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}&projectRoot=attacker-selected`,
    });

    expect(response.statusCode).toBe(200);
    expect(execute).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      canvasId: 'canvas-orders',
      includeGovernedSourceIdentity: false,
    });
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

  it('reports a Canvas without file authority as a conflict instead of an internal error', async () => {
    const execute = vi.fn().mockRejectedValue(new DbtProjectFileAuthorityRequiredError());
    const app = Fastify({ logger: false });
    registerDbtProjectGraphRoutes(app, {
      authenticator: {
        authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
      } as never,
      authorizer: {
        authorize: vi.fn().mockImplementation((_principal, requestedScope) => ({
          ok: true,
          context: {
            principal: principal(),
            scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
            action: requestedScope.action,
            requestId: 'req-1',
            authorizedAt: new Date('2026-07-13T00:00:00Z'),
          },
        })),
      } as never,
      useCase: { execute } as never,
      rateLimit: { max: 100, timeWindow: 60_000 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/dbt/graph?${VALID_QUERY}`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'dbt_project_file_authority_required' },
    });
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
      projectName: 'analytics',
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

function projectionWithSourceIdentity(): DbtProjectGraphProjection {
  return DbtProjectGraphProjectionSchema.parse({
    ...projection(),
    nodes: [
      {
        uniqueId: 'source.analytics.raw.orders',
        resourceType: 'source',
        name: 'orders',
        identifier: 'orders_physical',
        packageName: 'analytics',
        sourceName: 'raw',
        sourceIdentity: {
          database: 'warehouse',
          connectionName: 'Production PostgreSQL',
          schema: 'raw',
          databaseUser: 'warehouse_reader',
        },
        columns: [],
        tags: [],
        visualEditability: {
          status: 'code_only',
          reasons: ['phase_two_read_only_projection'],
        },
      },
    ],
    capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 1 },
  });
}

function buildAuthorizedApp(execute: ReturnType<typeof vi.fn>): FastifyInstance {
  const app = Fastify({ logger: false });
  registerDbtProjectGraphRoutes(app, {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: principal() }),
    } as never,
    authorizer: {
      authorize: vi.fn().mockImplementation((_principal, requestedScope) => ({
        ok: true,
        context: {
          principal: principal(),
          scope: { resource: 'environment', tenantId: { value: 'tenant-a' } },
          action: requestedScope.action,
          requestId: 'req-1',
          authorizedAt: new Date('2026-07-13T00:00:00Z'),
        },
      })),
    } as never,
    useCase: { execute } as never,
    rateLimit: { max: 100, timeWindow: 60_000 },
  });
  return app;
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
