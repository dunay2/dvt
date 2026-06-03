import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedPrincipal } from '../../../src/domain/auth/types.js';
import { workspaceContextRoute } from '../../../src/entrypoints/http/workspaceContextRoute.js';

function createReply(): {
  code: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
} {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

function principal(): AuthenticatedPrincipal {
  return {
    principalId: 'u-1',
    subjectId: 'sub-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user' as const,
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: ['dvt:runtime'],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['project-a'],
  };
}

describe('workspaceContextRoute', () => {
  it('returns 401 when authentication fails', async () => {
    const reply = createReply();
    const authenticator = {
      authenticateBearerToken: vi.fn(async () => ({
        ok: false as const,
        code: 'MISSING_TOKEN' as const,
      })),
    };
    const workspaceContextQuery = {
      getEffectiveWorkspaceContext: vi.fn(),
    };

    await workspaceContextRoute({ headers: {} } as never, reply as never, {
      authenticator,
      workspaceContextQuery,
    });

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        type: 'unauthorized',
        reason: 'authentication_failed',
      },
    });
    expect(workspaceContextQuery.getEffectiveWorkspaceContext).not.toHaveBeenCalled();
  });

  it('returns 403 when the principal has no effective workspace grant', async () => {
    const reply = createReply();
    const authenticatedPrincipal = principal();
    const authenticator = {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true as const,
        principal: authenticatedPrincipal,
      })),
    };
    const workspaceContextQuery = {
      getEffectiveWorkspaceContext: vi.fn(async () => null),
    };

    await workspaceContextRoute(
      {
        headers: {
          authorization: 'Bearer token-123',
        },
      } as never,
      reply as never,
      {
        authenticator,
        workspaceContextQuery,
      }
    );

    expect(authenticator.authenticateBearerToken).toHaveBeenCalledWith('token-123');
    expect(workspaceContextQuery.getEffectiveWorkspaceContext).toHaveBeenCalledWith(
      authenticatedPrincipal
    );
    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      error: {
        type: 'forbidden',
        reason: 'workspace_context_not_granted',
      },
    });
  });

  it('returns effective workspace context and granted options', async () => {
    const reply = createReply();
    const authenticatedPrincipal = principal();
    const effectiveWorkspace = {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
    };
    const availableWorkspaces = [
      effectiveWorkspace,
      {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
      },
    ];
    const authenticator = {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true as const,
        principal: authenticatedPrincipal,
      })),
    };
    const workspaceContextQuery = {
      getEffectiveWorkspaceContext: vi.fn(async () => ({
        effectiveWorkspace,
        availableWorkspaces,
      })),
    };

    await workspaceContextRoute(
      {
        headers: {
          authorization: 'Bearer token-123',
        },
      } as never,
      reply as never,
      {
        authenticator,
        workspaceContextQuery,
      }
    );

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      effectiveWorkspace,
      availableWorkspaces,
    });
  });
});
