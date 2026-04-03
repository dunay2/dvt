import { RunNotFoundError } from '@dvt/engine';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type {
  IAuthenticator,
  IExecutionScopeAuthorizer,
} from '../../../src/application/ports/auth.js';
import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  RequestedScope,
} from '../../../src/domain/auth/types.js';
import { registerAdminRoutes } from '../../../src/entrypoints/http/adminRoutes.js';

function createApp(deps: {
  readonly rebuildSnapshot: Parameters<
    typeof registerAdminRoutes
  >[1]['stateStore']['rebuildSnapshot'];
  readonly authenticateBearerToken: IAuthenticator['authenticateBearerToken'];
  readonly authorizer: IExecutionScopeAuthorizer;
}): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
  registerAdminRoutes(app, {
    stateStore: { rebuildSnapshot: deps.rebuildSnapshot },
    authenticator: { authenticateBearerToken: deps.authenticateBearerToken },
    authorizer: deps.authorizer,
  });
  return app;
}

const AUTHORIZED_HEADER = { authorization: 'Bearer token' };
type RebuildSnapshot = Parameters<typeof registerAdminRoutes>[1]['stateStore']['rebuildSnapshot'];
type WorkflowSnapshotResult = Awaited<ReturnType<RebuildSnapshot>>;

function makeSnapshot(
  runId: string,
  status: WorkflowSnapshotResult['status'] = 'PENDING'
): WorkflowSnapshotResult {
  return {
    runId,
    status,
    paused: false,
    cancelling: false,
    steps: {},
  };
}

const TEST_PRINCIPAL: AuthenticatedPrincipal = {
  principalId: 'p1',
  principalType: 'user',
  subjectId: 'subject-p1',
  issuer: 'https://issuer.example.com',
  audience: 'dvt-api',
  expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  rawScopes: [],
  assertedTenantIds: ['tenant-a'],
  assertedProjectIds: [],
};

const authorizerGranted: IExecutionScopeAuthorizer = {
  authorize: async <TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope & { readonly action: TAction },
    requestId: string
  ) => {
    const scope = {
      tenantId: requestedScope.tenantId,
      ...(requestedScope.projectId !== undefined
        ? { projectId: requestedScope.projectId }
        : {}),
      ...(requestedScope.environmentId !== undefined
        ? { environmentId: requestedScope.environmentId }
        : {}),
    };

    return {
      ok: true,
      context: {
        principal,
        scope,
        action: requestedScope.action,
        requestId,
        authorizedAt: new Date('2026-04-03T00:00:00.000Z'),
      },
    };
  },
};

const authorizerDeniedActionNotGranted: IExecutionScopeAuthorizer = {
  authorize: async () => ({
    ok: false,
    reason: 'ACTION_NOT_GRANTED',
  }),
};

describe('adminRoutes', () => {
  it('returns 401 when bearer token is missing', async () => {
    const rebuildSnapshot = vi.fn(async (_tenantId: string, _runId: string) => ({
      ...makeSnapshot('r1', 'PENDING'),
    }));
    const app = createApp({
      rebuildSnapshot,
      authenticateBearerToken: async () => ({ ok: false, code: 'MISSING_TOKEN' }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: {
          type: 'unauthorized',
          reason: 'missing_token',
        },
      });
      expect(rebuildSnapshot).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('returns 403 when principal lacks admin action grant', async () => {
    const rebuildSnapshot = vi.fn(async (_tenantId: string, _runId: string) => ({
      ...makeSnapshot('r1', 'PENDING'),
    }));
    const app = createApp({
      rebuildSnapshot,
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerDeniedActionNotGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          type: 'forbidden',
          reason: 'action_not_granted',
        },
      });
      expect(rebuildSnapshot).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('returns 400 when tenantId is missing', async () => {
    const app = createApp({
      rebuildSnapshot: async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'),
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          type: 'bad_request',
          reason: 'missing_tenant_id',
          target: 'tenantId',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('returns 400 when body is not an object', async () => {
    const app = createApp({
      rebuildSnapshot: async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'),
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload: ['tenant-a'],
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          type: 'bad_request',
          reason: 'invalid_body',
        },
      });
    } finally {
      await app.close();
    }
  });

  it.each([
    ['tenantId has invalid type', { tenantId: 123 }],
    ['tenantId is blank', { tenantId: '   ' }],
  ])('returns 400 when %s', async (_desc, payload) => {
    const app = createApp({
      rebuildSnapshot: async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'),
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: {
          type: 'bad_request',
          reason: 'invalid_tenant_id',
          target: 'tenantId',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('returns 200 with rebuilt snapshot status for authorized principal', async () => {
    const app = createApp({
      rebuildSnapshot: async (_tenantId, runId) => makeSnapshot(runId, 'RUNNING'),
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r42/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ runId: 'r42', status: 'RUNNING' });
    } finally {
      await app.close();
    }
  });

  it('returns 404 when the run does not exist for the tenant', async () => {
    const app = createApp({
      rebuildSnapshot: async (_tenantId, _runId) => {
        throw new RunNotFoundError('r404');
      },
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r404/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: {
          type: 'not_found',
          reason: 'run_not_found',
          details: { runId: 'r404' },
        },
      });
    } finally {
      await app.close();
    }
  });

  it('returns 500 for legacy stringly not-found errors', async () => {
    const app = createApp({
      rebuildSnapshot: async (_tenantId, _runId) => {
        throw new Error('RUN_NOT_FOUND: r404');
      },
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r404/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: {
          type: 'internal_server_error',
          reason: 'internal_error',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('returns 500 on unexpected rebuild failure', async () => {
    const app = createApp({
      rebuildSnapshot: async (_tenantId, _runId) => {
        throw new Error('db down');
      },
      authenticateBearerToken: async () => ({ ok: true, principal: TEST_PRINCIPAL }),
      authorizer: authorizerGranted,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r500/rebuild-snapshot',
        headers: AUTHORIZED_HEADER,
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: {
          type: 'internal_server_error',
          reason: 'internal_error',
        },
      });
    } finally {
      await app.close();
    }
  });
});
