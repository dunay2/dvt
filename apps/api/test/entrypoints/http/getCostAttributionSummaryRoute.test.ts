import { describe, expect, it, vi } from 'vitest';

import { costAttributionSummaryRoute } from '../../../src/entrypoints/http/costAttributionSummaryRoute.js';

function createReply(): {
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
} {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  };
}

function httpError(
  type: string,
  reason: string,
  target?: string
): { error: { type: string; reason: string; target?: string } } {
  return {
    error: {
      type,
      reason,
      ...(target === undefined ? {} : { target }),
    },
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
          scope: { resource: 'tenant', tenantId: { value: 'tenant-a' } },
          action: { kind: 'query', name: 'run:list' },
          requestId: 'req-1',
          authorizedAt: new Date('2026-05-24T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({
        tenantId: 'tenant-a',
        projectId: null,
        environmentId: null,
        runCount: 0,
        completedStepCount: 0,
        failedStepCount: 0,
        totalStepDurationMs: 0,
        totalCostAmount: null,
        currency: null,
        costCaptureStatus: 'unavailable',
        observedWindow: { firstEventAt: null, lastEventAt: null },
        runs: [],
        steps: [],
        nextCursor: null,
      }),
    },
  };
}

describe('costAttributionSummaryRoute', () => {
  it('returns 200 with a tenant-scoped cost attribution summary', async () => {
    const deps = createDeps();
    const reply = createReply();

    await costAttributionSummaryRoute(
      { id: 'req-1', headers: {}, query: { tenantId: 'tenant-a', limit: '25' } } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith({ limit: 25 }, expect.anything());
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCostAmount: null,
        currency: null,
        costCaptureStatus: 'unavailable',
      })
    );
  });

  it('passes project and environment scope to authorization before querying', async () => {
    const deps = createDeps();
    const reply = createReply();

    await costAttributionSummaryRoute(
      {
        id: 'req-2',
        headers: {},
        query: {
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          limit: '10',
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.authorizer.authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resource: 'environment',
        tenantId: expect.objectContaining({ value: 'tenant-a' }),
        projectId: expect.objectContaining({ value: 'proj-1' }),
        environmentId: expect.objectContaining({ value: 'env-1' }),
        action: { kind: 'query', name: 'run:list' },
      }),
      'req-2'
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await costAttributionSummaryRoute(
      { id: 'req-3', headers: {}, query: { limit: '25' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('forbidden', 'missing_tenant_scope', 'tenantId')
    );
  });

  it('returns 400 when environmentId is supplied without projectId', async () => {
    const deps = createDeps();
    const reply = createReply();

    await costAttributionSummaryRoute(
      {
        id: 'req-4',
        headers: {},
        query: { tenantId: 'tenant-a', environmentId: 'env-1', limit: '25' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'missing_project_id', 'projectId')
    );
  });

  it('returns 400 when limit exceeds the hard ceiling', async () => {
    const deps = createDeps();
    const reply = createReply();

    await costAttributionSummaryRoute(
      { id: 'req-5', headers: {}, query: { tenantId: 'tenant-a', limit: '1000' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'limit_out_of_range', 'limit')
    );
  });
});
