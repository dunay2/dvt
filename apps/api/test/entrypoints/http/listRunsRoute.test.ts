import { describe, expect, it, vi } from 'vitest';

import { listRunsRoute } from '../../../src/entrypoints/http/listRunsRoute.js';

function createReply(): { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

function createDeps(): {
  authenticator: { authenticateBearerToken: ReturnType<typeof vi.fn> };
  authorizer: { authorize: ReturnType<typeof vi.fn> };
  useCase: { execute: ReturnType<typeof vi.fn> };
} {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({
        ok: true,
        principal: {
          principalId: 'u',
          subjectId: 'u',
          issuer: 'i',
          audience: 'a',
          principalType: 'user',
          expiresAt: new Date('2030-01-01T00:00:00Z'),
          rawScopes: [],
          assertedTenantIds: ['tenant-a'],
          assertedProjectIds: [],
        },
      }),
    },
    authorizer: {
      authorize: vi.fn().mockResolvedValue({
        ok: true,
        context: {
          principal: {},
          scope: { tenantId: { value: 'tenant-a' } },
          action: { kind: 'query', name: 'run:list' },
          requestId: 'req-1',
          authorizedAt: new Date('2026-03-19T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({
        items: [
          {
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            logicalAttemptId: 1,
            provider: 'mock',
            status: 'FAILED',
          },
        ],
        nextCursor: null,
      }),
    },
  };
}

describe('listRunsRoute', () => {
  it('returns 200 with a tenant-scoped run list', async () => {
    const deps = createDeps();
    const reply = createReply();

    await listRunsRoute(
      { id: 'req-1', headers: {}, query: { tenantId: 'tenant-a', limit: '25' } } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith({ limit: 25 }, expect.anything());
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await listRunsRoute(
      { id: 'req-2', headers: {}, query: { limit: '25' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'FORBIDDEN', code: 'MISSING_TENANT_SCOPE' });
  });

  it('returns 400 when tenantId is present but invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await listRunsRoute(
      { id: 'req-2b', headers: {}, query: { tenantId: '   ', limit: '25' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_TENANT_ID' });
  });

  it('returns 400 when limit is not numeric', async () => {
    const deps = createDeps();
    const reply = createReply();

    await listRunsRoute(
      { id: 'req-3', headers: {}, query: { tenantId: 'tenant-a', limit: 'abc' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_LIMIT' });
  });

  it('returns 400 when limit exceeds the hard ceiling', async () => {
    const deps = createDeps();
    const reply = createReply();

    await listRunsRoute(
      { id: 'req-4', headers: {}, query: { tenantId: 'tenant-a', limit: '1000' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'LIMIT_OUT_OF_RANGE' });
  });

  it('returns 400 when cursor is supplied before keyset paging is implemented', async () => {
    const deps = createDeps();
    const reply = createReply();

    await listRunsRoute(
      { id: 'req-5', headers: {}, query: { tenantId: 'tenant-a', cursor: 'opaque' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'UNSUPPORTED_CURSOR' });
  });

  it('returns 400 when projectId is invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await listRunsRoute(
      {
        id: 'req-6',
        headers: {},
        query: { tenantId: 'tenant-a', projectId: '   ', limit: '25' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_PROJECT_ID' });
  });
});
