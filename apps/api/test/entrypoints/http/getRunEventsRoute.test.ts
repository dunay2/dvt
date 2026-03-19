import { describe, expect, it, vi } from 'vitest';

import { getRunEventsRoute } from '../../../src/entrypoints/http/getRunEventsRoute.js';

function createReply() {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

function createDeps() {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn().mockResolvedValue({ ok: true, principal: { principalId: 'u', subjectId: 'u', issuer: 'i', audience: 'a', principalType: 'user', expiresAt: new Date('2030-01-01T00:00:00Z'), rawScopes: [], assertedTenantIds: ['tenant-a'], assertedProjectIds: [] } }),
    },
    authorizer: {
      authorize: vi.fn().mockResolvedValue({ ok: true, context: { principal: {}, scope: { tenantId: { value: 'tenant-a' } }, action: { kind: 'query', name: 'run:logs:view' }, requestId: 'req-1', authorizedAt: new Date('2026-03-19T00:00:00Z') } }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({ items: [{ runSeq: 1 }], nextCursor: 1 }),
    },
  };
}

describe('getRunEventsRoute', () => {
  it('returns 200 with tenant-scoped run events', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      { id: 'req-1', headers: {}, params: { runId: 'run-1' }, query: { tenantId: 'tenant-a', afterSeq: '0', limit: '10' } } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith({ runId: 'run-1', afterSeq: 0, limit: 10 }, expect.anything());
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('returns 400 when runId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      { id: 'req-2', headers: {}, params: {}, query: { tenantId: 'tenant-a' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_RUN_ID' });
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      { id: 'req-3', headers: {}, params: { runId: 'run-1' }, query: {} } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'FORBIDDEN', code: 'MISSING_TENANT_SCOPE' });
  });

  it('returns 400 when afterSeq is not numeric', async () => {
    const deps = createDeps();
    const reply = createReply();

    await getRunEventsRoute(
      { id: 'req-4', headers: {}, params: { runId: 'run-1' }, query: { tenantId: 'tenant-a', afterSeq: 'abc' } } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_AFTER_SEQ' });
  });
});
