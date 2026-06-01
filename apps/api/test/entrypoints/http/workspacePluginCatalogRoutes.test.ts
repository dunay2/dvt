import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedPrincipal } from '../../../src/domain/auth/types.js';
import { registerWorkspacePluginCatalogRoutes } from '../../../src/entrypoints/http/workspacePluginCatalogRoutes.js';

type WorkspacePluginCatalogRouteDeps = Parameters<typeof registerWorkspacePluginCatalogRoutes>[1];
type AuthorizeWorkspacePluginCatalog = WorkspacePluginCatalogRouteDeps['authorizer']['authorize'];

function createPrincipal(): AuthenticatedPrincipal {
  return {
    principalId: 'u-1',
    subjectId: 'sub-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user' as const,
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
  };
}

function createDeps(
  overrides: Partial<Parameters<typeof registerWorkspacePluginCatalogRoutes>[1]> = {}
): Parameters<typeof registerWorkspacePluginCatalogRoutes>[1] {
  const authorize = vi.fn(
    async (
      ...[principal, requestedScope, requestId]: Parameters<AuthorizeWorkspacePluginCatalog>
    ) => {
      const { action, ...scope } = requestedScope;
      return {
        ok: true as const,
        context: {
          principal,
          scope,
          action,
          requestId,
          authorizedAt: new Date('2026-05-31T00:00:00.000Z'),
        },
      };
    }
  ) as unknown as AuthorizeWorkspacePluginCatalog;

  return {
    authenticator: {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true as const,
        principal: createPrincipal(),
      })),
    },
    authorizer: {
      authorize,
    },
    listWorkspacePluginsUseCase: {
      execute: vi.fn(async () => [
        {
          id: 'warehouse-optimizer',
          name: 'Warehouse Optimizer',
          version: '0.1.0',
          description: 'DB-only cost policy plugin.',
          capabilities: ['cost.analyze'],
          enabled: true,
          permissions: [],
          backendPluginId: 'warehouse-optimizer',
        },
      ]),
    },
    rateLimit: { max: 100, timeWindow: 60_000 },
    ...overrides,
  };
}

describe('workspacePluginCatalogRoutes', () => {
  it('returns 401 before querying plugins when authentication fails', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps({
      authenticator: {
        authenticateBearerToken: vi.fn(async () => ({
          ok: false as const,
          code: 'MISSING_TOKEN' as const,
        })),
      },
    });
    registerWorkspacePluginCatalogRoutes(app, deps);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/workspace/plugins' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { type: 'unauthorized', reason: 'authentication_failed' },
    });
    expect(deps.listWorkspacePluginsUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects missing workspace scope before authorization', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps();
    registerWorkspacePluginCatalogRoutes(app, deps);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/workspace/plugins',
      headers: { authorization: 'Bearer token-123' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: { type: 'forbidden', reason: 'missing_tenant_scope' },
    });
    expect(deps.authorizer.authorize).not.toHaveBeenCalled();
    expect(deps.listWorkspacePluginsUseCase.execute).not.toHaveBeenCalled();
  });

  it('lists authorized DB-backed workspace plugins', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps();
    registerWorkspacePluginCatalogRoutes(app, deps);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/workspace/plugins?tenantId=tenant-a&projectId=project-a&environmentId=dev',
      headers: { authorization: 'Bearer token-123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      plugins: [
        {
          id: 'warehouse-optimizer',
          name: 'Warehouse Optimizer',
          version: '0.1.0',
          description: 'DB-only cost policy plugin.',
          capabilities: ['cost.analyze'],
          enabled: true,
          permissions: [],
          backendPluginId: 'warehouse-optimizer',
        },
      ],
    });
    expect(deps.authenticator.authenticateBearerToken).toHaveBeenCalledWith('token-123');
    expect(deps.authorizer.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ principalId: 'u-1' }),
      expect.objectContaining({ action: { kind: 'query', name: 'workspace:plugins:view' } }),
      expect.any(String)
    );
    expect(deps.listWorkspacePluginsUseCase.execute).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
    });
  });

  it('returns 403 when the principal lacks the plugin catalog view action', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps({
      authorizer: {
        authorize: vi.fn(async () => ({
          ok: false as const,
          reason: 'ACTION_NOT_GRANTED' as const,
        })) as unknown as AuthorizeWorkspacePluginCatalog,
      },
    });
    registerWorkspacePluginCatalogRoutes(app, deps);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/workspace/plugins?tenantId=tenant-a&projectId=project-a&environmentId=dev',
      headers: { authorization: 'Bearer token-123' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: { type: 'forbidden', reason: 'ACTION_NOT_GRANTED' },
    });
    expect(deps.listWorkspacePluginsUseCase.execute).not.toHaveBeenCalled();
  });
});
