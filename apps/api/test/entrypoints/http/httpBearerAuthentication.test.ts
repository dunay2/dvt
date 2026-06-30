import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { IAuthenticator } from '../../../src/application/ports/auth.js';
import { authenticateHttpBearerRequest } from '../../../src/entrypoints/http/httpBearerAuthentication.js';

const principal = {
  principalId: 'u-1',
  subjectId: 'sub-1',
  issuer: 'issuer',
  audience: 'audience',
  principalType: 'user' as const,
  expiresAt: new Date('2030-01-01T00:00:00Z'),
  rawScopes: ['scope:a'],
  assertedTenantIds: ['tenant-a'],
  assertedProjectIds: ['project-a'],
};

function createReply(): FastifyReply {
  const reply = {
    code: vi.fn(() => reply),
    send: vi.fn(() => reply),
  };
  return reply as unknown as FastifyReply;
}

function createRequest(authorization: string | undefined): FastifyRequest {
  return {
    headers: { authorization },
  } as FastifyRequest;
}

describe('authenticateHttpBearerRequest', () => {
  it('returns the authenticated principal for a bearer token', async () => {
    const authenticator: IAuthenticator = {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true as const,
        principal,
      })),
    };
    const reply = createReply();

    const result = await authenticateHttpBearerRequest(
      createRequest('Bearer token-123'),
      reply,
      authenticator
    );

    expect(result).toBe(principal);
    expect(authenticator.authenticateBearerToken).toHaveBeenCalledWith('token-123');
    expect(reply.code).not.toHaveBeenCalled();
  });

  it('sends the canonical unauthorized response when authentication fails', async () => {
    const authenticator: IAuthenticator = {
      authenticateBearerToken: vi.fn(async () => ({
        ok: false as const,
        code: 'MISSING_TOKEN' as const,
      })),
    };
    const reply = createReply();

    const result = await authenticateHttpBearerRequest(
      createRequest(undefined),
      reply,
      authenticator
    );

    expect(result).toBeNull();
    expect(authenticator.authenticateBearerToken).toHaveBeenCalledWith(undefined);
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        type: 'unauthorized',
        reason: 'authentication_failed',
      },
    });
  });
});
