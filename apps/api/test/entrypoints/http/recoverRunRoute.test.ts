import { describe, expect, it, vi } from 'vitest';

import { recoverRunRoute } from '../../../src/entrypoints/http/recoverRunRoute.js';
import { RUN_COMMAND_ACTION } from '../../../src/entrypoints/http/runCommandRoute.constants.js';
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
  runIdGenerator: ReturnType<typeof vi.fn>;
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
          action: { kind: 'command', name: RUN_COMMAND_ACTION.RETRY },
          requestId: 'req-1',
          authorizedAt: new Date('2026-04-08T00:00:00Z'),
        },
      }),
    },
    useCase: {
      execute: vi.fn().mockResolvedValue({
        contractVersion: 'v1',
        sourceRunId: 'source-run-1',
        recoveryRunId: 'recovery-run-1',
        accepted: true,
      }),
    },
    runIdGenerator: vi.fn().mockReturnValue('recovery-run-1'),
  };
}

describe('recoverRunRoute', () => {
  it('returns 202 and authorizes run:retry', async () => {
    const deps = createDeps();
    const reply = createReply();

    await recoverRunRoute(
      {
        id: 'req-1',
        headers: {},
        params: { runId: 'source-run-1' },
        body: {
          tenantId: 'tenant-a',
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(deps.authorizer.authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: RUN_COMMAND_ACTION.RETRY },
      }),
      'req-1'
    );
    expect(deps.useCase.execute).toHaveBeenCalledWith(
      {
        sourceRunId: 'source-run-1',
        recoveryRunId: 'recovery-run-1',
      },
      expect.anything()
    );
    expect(deps.runIdGenerator).toHaveBeenCalledTimes(1);
    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS_CODE.accepted);
  });

  it('returns 400 for invalid request payload', async () => {
    const deps = createDeps();
    const reply = createReply();

    await recoverRunRoute(
      {
        id: 'req-2',
        headers: {},
        params: { runId: 'source-run-1' },
        body: {
          tenantId: 'tenant-a',
          targetAdapter: 'invalid',
        },
      } as never,
      reply as never,
      deps as never
    );

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      httpError('bad_request', 'invalid_body', 'targetAdapter')
    );
    expect(deps.authorizer.authorize).not.toHaveBeenCalled();
    expect(deps.useCase.execute).not.toHaveBeenCalled();
  });
});
