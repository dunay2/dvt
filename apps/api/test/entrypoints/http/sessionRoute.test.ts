import { describe, expect, it, vi } from 'vitest';

import { sessionRoute } from '../../../src/entrypoints/http/sessionRoute.js';

function createReply(): {
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

describe('sessionRoute', () => {
  it('returns 401 when authentication fails', async () => {
    const reply = createReply();
    const authenticator = {
      authenticateBearerToken: vi.fn(async () => ({
        ok: false as const,
        code: 'MISSING_TOKEN' as const,
      })),
    };

    await sessionRoute(
      {
        headers: {},
      } as never,
      reply as never,
      {
        authenticator,
      }
    );

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        type: 'unauthorized',
        reason: 'authentication_failed',
      },
    });
  });

  it('returns principal and grant scope when authentication succeeds', async () => {
    const reply = createReply();
    const authenticator = {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true as const,
        principal: {
          principalId: 'u-1',
          subjectId: 'sub-1',
          issuer: 'issuer',
          audience: 'aud',
          principalType: 'user' as const,
          expiresAt: new Date('2030-01-01T00:00:00Z'),
          rawScopes: ['read', 'write'],
          assertedTenantIds: ['tenant-a'],
          assertedProjectIds: ['project-a'],
        },
      })),
    };

    await sessionRoute(
      {
        headers: {
          authorization: 'Bearer token-123',
        },
      } as never,
      reply as never,
      {
        authenticator,
      }
    );

    expect(authenticator.authenticateBearerToken).toHaveBeenCalledWith('token-123');
    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      principal: {
        principalId: 'u-1',
        subjectId: 'sub-1',
        principalType: 'user',
        issuer: 'issuer',
        audience: 'aud',
        expiresAtIso: '2030-01-01T00:00:00.000Z',
      },
      grants: {
        tenantIds: ['tenant-a'],
        projectIds: ['project-a'],
        scopes: ['read', 'write'],
      },
    });
  });
});
