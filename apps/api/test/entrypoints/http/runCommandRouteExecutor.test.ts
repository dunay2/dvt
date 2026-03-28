import { RunMetadataNotFoundError } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import { executeAuthorizedRunCommandRoute } from '../../../src/entrypoints/http/runCommandRouteExecutor.js';

function createReply(): { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

function createRequest(): { id: string; headers: Record<string, string> } {
  return {
    id: 'req-1',
    headers: {},
  };
}

function createParsedCommand(): {
  ok: true;
  value: {
    command: { runId: string; signalType: 'CANCEL' };
    authorization: { tenantId: { value: string }; actionName: string };
  };
} {
  return {
    ok: true,
    value: {
      command: { runId: 'run-1', signalType: 'CANCEL' },
      authorization: {
        tenantId: { value: 'tenant-a' },
        actionName: 'run:cancel',
      },
    },
  };
}

function createDeps(): {
  authenticator: { authenticateBearerToken: ReturnType<typeof vi.fn> };
  authorizer: { authorize: ReturnType<typeof vi.fn> };
  execute: ReturnType<typeof vi.fn>;
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
          action: { kind: 'command', name: 'run:cancel' },
          requestId: 'req-1',
          authorizedAt: new Date('2026-03-19T00:00:00Z'),
        },
      }),
    },
    execute: vi.fn().mockResolvedValue({ runId: 'run-1', accepted: true }),
  };
}

describe('executeAuthorizedRunCommandRoute', () => {
  it('returns parser error directly without auth or execution', async () => {
    const request = createRequest();
    const reply = createReply();
    const deps = createDeps();

    await executeAuthorizedRunCommandRoute(
      request as never,
      reply as never,
      deps as never,
      {
        ok: false,
        status: 400,
        body: { error: 'BAD_REQUEST', code: 'INVALID_BODY' },
      }
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ error: 'BAD_REQUEST', code: 'INVALID_BODY' });
    expect(deps.authenticator.authenticateBearerToken).not.toHaveBeenCalled();
    expect(deps.authorizer.authorize).not.toHaveBeenCalled();
    expect(deps.execute).not.toHaveBeenCalled();
  });

  it('returns 401 when authentication fails', async () => {
    const request = createRequest();
    const reply = createReply();
    const deps = createDeps();
    deps.authenticator.authenticateBearerToken.mockResolvedValueOnce({
      ok: false,
      code: 'AUTH_REQUIRED',
    });

    await executeAuthorizedRunCommandRoute(
      request as never,
      reply as never,
      deps as never,
      createParsedCommand() as never
    );

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'UNAUTHORIZED', code: 'AUTH_REQUIRED' });
    expect(deps.execute).not.toHaveBeenCalled();
  });

  it('returns 403 when authorization denies scope', async () => {
    const request = createRequest();
    const reply = createReply();
    const deps = createDeps();
    deps.authorizer.authorize.mockResolvedValueOnce({
      ok: false,
      reason: 'ACTION_NOT_GRANTED',
    });

    await executeAuthorizedRunCommandRoute(
      request as never,
      reply as never,
      deps as never,
      createParsedCommand() as never
    );

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ error: 'FORBIDDEN', code: 'ACTION_NOT_GRANTED' });
    expect(deps.execute).not.toHaveBeenCalled();
  });

  it('maps known runtime domain errors to HTTP responses', async () => {
    const request = createRequest();
    const reply = createReply();
    const deps = createDeps();
    deps.execute.mockRejectedValueOnce(new RunMetadataNotFoundError('run-1'));

    await executeAuthorizedRunCommandRoute(
      request as never,
      reply as never,
      deps as never,
      createParsedCommand() as never
    );

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: 'NOT_FOUND', code: 'RUN_NOT_FOUND' });
  });

  it('rethrows unknown runtime errors', async () => {
    const request = createRequest();
    const reply = createReply();
    const deps = createDeps();
    const unknownError = new Error('boom');
    deps.execute.mockRejectedValueOnce(unknownError);

    await expect(
      executeAuthorizedRunCommandRoute(
        request as never,
        reply as never,
        deps as never,
        createParsedCommand() as never
      )
    ).rejects.toThrow('boom');
  });
});
