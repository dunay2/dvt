import { describe, expect, it, vi } from 'vitest';

import { getRunRoute } from '../../../src/entrypoints/http/getRunRoute.js';

type RouteReply = {
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
};

function createReply(): RouteReply {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

function createDeps(
  result = { runId: 'run-1', tenantId: 'tenant-a', status: 'RUNNING', enriched: false }
): {
  authenticator: { authenticateBearerToken: ReturnType<typeof vi.fn> };
  authorizer: { authorize: ReturnType<typeof vi.fn> };
  useCase: { execute: ReturnType<typeof vi.fn> };
} {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({
        ok: true,
        principal: {
          principalId: 'user-1',
          subjectId: 'user-1',
          issuer: 'issuer',
          audience: 'audience',
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
          action: { kind: 'query', name: 'run:view' },
          requestId: 'req-1',
          authorizedAt: new Date('2026-03-19T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue(result),
    },
  };
}

describe('getRunRoute', () => {
  it('returns 200 with snapshot status by default', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-1',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', enriched: false },
      expect.anything()
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('passes enriched=true explicitly to the use case', async () => {
    const deps = createDeps({
      runId: 'run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: true,
    });
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-2',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a', enriched: 'true' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', enriched: true },
      expect.anything()
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('returns 400 when runId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      { id: 'req-3', headers: {}, params: {}, query: { tenantId: 'tenant-a' } } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_RUN_ID' });
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      { id: 'req-4', headers: {}, params: { runId: 'run-1' }, query: {} } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'FORBIDDEN', code: 'MISSING_TENANT_SCOPE' });
  });

  it('returns 400 when tenantId is present but invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-4b',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: '   ' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_TENANT_ID' });
  });

  it('returns 400 when enriched query value is invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunRoute(
      {
        id: 'req-5',
        headers: {},
        params: { runId: 'run-1' },
        query: { tenantId: 'tenant-a', enriched: 'sometimes' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      code: 'INVALID_ENRICHED_FLAG',
    });
  });
});
