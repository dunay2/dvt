import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerProjectOnboardingRoutes } from '../../../src/entrypoints/http/projectOnboardingRoutes.js';

function createDeps(
  overrides: Partial<Parameters<typeof registerProjectOnboardingRoutes>[1]> = {}
): Parameters<typeof registerProjectOnboardingRoutes>[1] {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true as const,
        principal: {
          principalId: 'u-1',
          subjectId: 'sub-1',
          issuer: 'issuer',
          audience: 'audience',
          principalType: 'user' as const,
          expiresAt: new Date('2030-01-01T00:00:00Z'),
          rawScopes: ['project:create'],
          assertedTenantIds: ['tenant-a'],
          assertedProjectIds: [],
        },
      })),
    },
    listProjectsUseCase: {
      execute: vi.fn(async () => ({
        tenants: [{ tenantId: 'tenant-a', canCreateProject: true }],
        projects: [],
      })),
    },
    createProjectUseCase: {
      execute: vi.fn(async () => ({
        kind: 'created' as const,
        project: {
          tenantId: 'tenant-a',
          projectId: 'analytics-12345678',
          name: 'Analytics',
          environmentIds: ['dev'],
        },
        effectiveWorkspace: {
          tenantId: 'tenant-a',
          projectId: 'analytics-12345678',
          environmentId: 'dev',
        },
      })),
    },
    rateLimit: { max: 100, timeWindow: 60_000 },
    ...overrides,
  };
}

describe('projectOnboardingRoutes', () => {
  it('returns 401 before listing projects when authentication fails', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps({
      authenticator: {
        authenticateBearerToken: vi.fn(async () => ({
          ok: false as const,
          code: 'MISSING_TOKEN' as const,
        })),
      },
    });
    registerProjectOnboardingRoutes(app, deps);
    await app.ready();

    const response = await app.inject({ method: 'GET', url: '/projects' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { type: 'unauthorized', reason: 'authentication_failed' },
    });
    expect(deps.listProjectsUseCase.execute).not.toHaveBeenCalled();
  });

  it('lists tenant project options for an authenticated principal', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps();
    registerProjectOnboardingRoutes(app, deps);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: 'Bearer token-123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      tenants: [{ tenantId: 'tenant-a', canCreateProject: true }],
      projects: [],
    });
    expect(deps.authenticator.authenticateBearerToken).toHaveBeenCalledWith('token-123');
  });

  it('creates a tenant project only with an idempotency key', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps();
    registerProjectOnboardingRoutes(app, deps);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: {
        authorization: 'Bearer token-123',
        'idempotency-key': 'create-analytics-1',
      },
      payload: { tenantId: 'tenant-a', name: 'Analytics' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      project: {
        tenantId: 'tenant-a',
        projectId: 'analytics-12345678',
        name: 'Analytics',
        environmentIds: ['dev'],
      },
      effectiveWorkspace: {
        tenantId: 'tenant-a',
        projectId: 'analytics-12345678',
        environmentId: 'dev',
      },
    });
    expect(deps.createProjectUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ principalId: 'u-1' }),
      { tenantId: 'tenant-a', name: 'Analytics', idempotencyKey: 'create-analytics-1' }
    );
  });

  it('rejects project creation without an idempotency key', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps();
    registerProjectOnboardingRoutes(app, deps);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { authorization: 'Bearer token-123' },
      payload: { tenantId: 'tenant-a', name: 'Analytics' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { type: 'bad_request', reason: 'missing_idempotency_key' },
    });
    expect(deps.createProjectUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects reused idempotency keys with a conflicting payload', async () => {
    const app = Fastify({ logger: false });
    const deps = createDeps({
      createProjectUseCase: {
        execute: vi.fn(async () => ({ kind: 'idempotency_conflict' as const })),
      },
    });
    registerProjectOnboardingRoutes(app, deps);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: {
        authorization: 'Bearer token-123',
        'idempotency-key': 'create-analytics-1',
      },
      payload: { tenantId: 'tenant-a', name: 'Analytics Renamed' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'idempotency_conflict' },
    });
  });
});
