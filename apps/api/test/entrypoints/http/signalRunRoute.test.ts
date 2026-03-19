import { describe, expect, it, vi } from 'vitest';

import { signalRunRoute } from '../../../src/entrypoints/http/signalRunRoute.js';

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
          action: { kind: 'command', name: 'run:signal' },
          requestId: 'req-1',
          authorizedAt: new Date('2026-03-19T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({ runId: 'run-1', signalType: 'CANCEL', accepted: true }),
    },
  };
}

describe('signalRunRoute', () => {
  it('returns 202 for a valid signal request', async () => {
    const deps = createDeps();
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-1',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a', signalType: 'CANCEL', reason: 'operator cancel' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', signalType: 'CANCEL', reason: 'operator cancel' },
      expect.anything()
    );
    expect(reply.code).toHaveBeenCalledWith(202);
  });

  it('returns 400 when signalType is not in the allowed vocabulary', async () => {
    const deps = createDeps();
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-2',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a', signalType: 'MAKE_IT_GO_FASTER' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_SIGNAL_TYPE' });
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-3',
        headers: {},
        params: { runId: 'run-1' },
        body: { signalType: 'CANCEL' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'FORBIDDEN', code: 'MISSING_TENANT_SCOPE' });
  });

  it('returns 400 when body is not an object', async () => {
    const deps = createDeps();
    const reply = createReply();

    await signalRunRoute(
      { id: 'req-4', headers: {}, params: { runId: 'run-1' }, body: 'retry' } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_BODY' });
  });
});
