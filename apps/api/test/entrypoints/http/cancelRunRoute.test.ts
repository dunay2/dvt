import { describe, expect, it, vi } from 'vitest';

import { cancelRunRoute } from '../../../src/entrypoints/http/cancelRunRoute.js';
import { SIGNAL_COMMAND_ACTION } from '../../../src/entrypoints/http/signalRunRouteParser.constants.js';
import { HTTP_STATUS_CODE } from '../../../src/routes/httpStatus.js';

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

function httpError(type: string, reason: string, target?: string) {
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
          scope: { tenantId: { value: 'tenant-a' } },
          action: { kind: 'command', name: SIGNAL_COMMAND_ACTION.CANCEL },
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

describe('cancelRunRoute', () => {
  it('returns 202 and enforces run:cancel action', async () => {
    const deps = createDeps();
    const reply = createReply();

    await cancelRunRoute(
      {
        id: 'req-1',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a', reason: 'operator cancel' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.useCase.execute).toHaveBeenCalledWith(
      { runId: 'run-1', signalType: 'CANCEL', reason: 'operator cancel' },
      expect.anything()
    );
    expect(deps.authorizer.authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: SIGNAL_COMMAND_ACTION.CANCEL },
      }),
      'req-1'
    );
    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS_CODE.accepted);
  });

  it('returns 403 when tenantId is missing', async () => {
    const deps = createDeps();
    const reply = createReply();

    await cancelRunRoute(
      {
        id: 'req-2',
        headers: {},
        params: { runId: 'run-1' },
        body: {},
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('forbidden', 'missing_tenant_scope', 'tenantId')
    );
  });

  it('returns 400 when body is not an object', async () => {
    const deps = createDeps();
    const reply = createReply();

    await cancelRunRoute(
      { id: 'req-3', headers: {}, params: { runId: 'run-1' }, body: 'cancel' } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(httpError('bad_request', 'invalid_body'));
  });

  it('returns 401 when authentication fails', async () => {
    const deps = createDeps();
    deps.authenticator.authenticateBearerToken.mockResolvedValueOnce({
      ok: false,
      code: 'MISSING_TOKEN',
    });
    const reply = createReply();

    await cancelRunRoute(
      {
        id: 'req-4',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith(httpError('unauthorized', 'missing_token'));
    expect(deps.authorizer.authorize).not.toHaveBeenCalled();
    expect(deps.useCase.execute).not.toHaveBeenCalled();
  });

  it('returns 403 when authorization is denied', async () => {
    const deps = createDeps();
    deps.authorizer.authorize.mockResolvedValueOnce({
      ok: false,
      reason: 'ACTION_NOT_GRANTED',
    });
    const reply = createReply();

    await cancelRunRoute(
      {
        id: 'req-5',
        headers: { authorization: 'Bearer token' },
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(httpError('forbidden', 'action_not_granted'));
    expect(deps.useCase.execute).not.toHaveBeenCalled();
  });
});
