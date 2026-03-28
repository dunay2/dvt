import { describe, expect, it, vi } from 'vitest';

import { signalRunRoute } from '../../../src/entrypoints/http/signalRunRoute.js';
import {
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
} from '../../../src/entrypoints/http/signalRunRouteParser.js';
import { HTTP_STATUS_CODE } from '../../../src/routes/httpStatus.js';

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
  compatibilityPolicy: { allowCancelSignalType: boolean };
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
          action: { kind: 'command', name: SIGNAL_COMMAND_ACTION.SIGNAL },
          requestId: 'req-1',
          authorizedAt: new Date('2026-03-19T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({ runId: 'run-1', signalType: 'CANCEL', accepted: true }),
    },
    compatibilityPolicy: {
      allowCancelSignalType: true,
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
    expect(deps.authorizer.authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: SIGNAL_COMMAND_ACTION.CANCEL },
      }),
      'req-1'
    );
    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS_CODE.accepted);
  });

  it('authorizes PAUSE using run:signal action', async () => {
    const deps = createDeps();
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-1b',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a', signalType: 'PAUSE' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.authorizer.authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: SIGNAL_COMMAND_ACTION.SIGNAL },
      }),
      'req-1b'
    );
    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS_CODE.accepted);
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
    expect(reply.send).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_SIGNAL_TYPE,
    });
  });

  it('returns 400 for CANCEL when compatibility policy disables it', async () => {
    const deps = createDeps();
    deps.compatibilityPolicy.allowCancelSignalType = false;
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-2b',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a', signalType: 'CANCEL' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_SIGNAL_TYPE,
    });
    expect(deps.useCase.execute).not.toHaveBeenCalled();
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
    expect(reply.send).toHaveBeenCalledWith({
      error: 'FORBIDDEN',
      code: SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE,
    });
  });

  it('returns 400 when tenantId is present but invalid', async () => {
    const deps = createDeps();
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-3b',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: '   ', signalType: 'CANCEL' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID,
    });
  });

  it('returns 400 when tenantId has invalid type', async () => {
    const deps = createDeps();
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-3c',
        headers: {},
        params: { runId: 'run-1' },
        body: { tenantId: 123, signalType: 'CANCEL' },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID,
    });
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
    expect(reply.send).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_BODY,
    });
  });

  it('treats blank bearer token as missing token', async () => {
    const deps = createDeps();
    deps.authenticator.authenticateBearerToken.mockResolvedValueOnce({
      ok: false,
      code: 'AUTH_REQUIRED',
    });
    const reply = createReply();

    await signalRunRoute(
      {
        id: 'req-5',
        headers: { authorization: 'Bearer     ' },
        params: { runId: 'run-1' },
        body: { tenantId: 'tenant-a', signalType: 'CANCEL' },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.authenticator.authenticateBearerToken).toHaveBeenCalledWith(undefined);
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'UNAUTHORIZED', code: 'AUTH_REQUIRED' });
  });
});
