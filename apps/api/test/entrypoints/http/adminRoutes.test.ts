import type { IRunStateStoreMaintenance } from '@dvt/engine';
import { RunNotFoundError } from '@dvt/engine';
import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerAdminRoutes } from '../../../src/entrypoints/http/adminRoutes.js';

type RebuildSnapshot = IRunStateStoreMaintenance['rebuildSnapshot'];
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

function createApp(
  rebuildSnapshot: RebuildSnapshot,
  options?: {
    readonly authenticateBearerToken?: (token: string | undefined) => Promise<unknown>;
    readonly authorize?: () => Promise<unknown>;
  }
): {
  app: ReturnType<typeof Fastify>;
  rebuildSnapshotSpy: ReturnType<typeof vi.fn>;
} {
  const app = Fastify({ logger: false });
  const rebuildSnapshotSpy = vi.fn(rebuildSnapshot);
  const authenticateBearerToken =
    options?.authenticateBearerToken ??
    (async () => ({
      ok: true,
      principal: {
        principalId: 'user-1',
        subjectId: 'user-1',
        issuer: 'issuer',
        audience: 'audience',
        principalType: 'user',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
        rawScopes: [],
        assertedTenantIds: ['tenant-a'],
        assertedProjectIds: [],
      },
    }));
  const authorize =
    options?.authorize ??
    (async () => ({
      ok: true,
      context: {
        principal: {
          principalId: 'user-1',
          principalType: 'user',
        },
        scope: { tenantId: { value: 'tenant-a' } },
        action: { kind: 'command', name: 'admin:rebuild-snapshot' },
        requestId: 'req-1',
        authorizedAt: new Date('2026-04-03T00:00:00Z'),
      },
    }));

  registerAdminRoutes(
    app,
    {
      rebuildSnapshot: rebuildSnapshotSpy,
    } as never,
    {
      authenticator: {
        authenticateBearerToken,
      } as never,
      authorizer: {
        authorize,
      } as never,
    }
  );
  return { app, rebuildSnapshotSpy };
}

function buildAuthorizedApp(
  rebuildSnapshot: RebuildSnapshot,
  options?: {
    readonly authenticateBearerToken?: (token: string | undefined) => Promise<unknown>;
    readonly authorize?: () => Promise<unknown>;
    readonly auth?: {
      readonly tenantId?: string;
      readonly actionName?: string;
      readonly principalId?: string;
      readonly principalType?: string;
      readonly requestId?: string;
    };
  }
): {
  app: ReturnType<typeof Fastify>;
  rebuildSnapshotSpy: ReturnType<typeof vi.fn>;
} {
  const auth = options?.auth;
  const principalId = auth?.principalId ?? 'user-1';
  const principalType = auth?.principalType ?? 'user';
  const tenantId = auth?.tenantId ?? 'tenant-a';
  const actionName = auth?.actionName ?? 'admin:rebuild-snapshot';
  const requestId = auth?.requestId ?? 'req-1';

  return createApp(rebuildSnapshot, {
    authenticateBearerToken:
      options?.authenticateBearerToken ??
      (async () => ({
        ok: true,
        principal: {
          principalId,
          subjectId: principalId,
          issuer: 'issuer',
          audience: 'audience',
          principalType,
          expiresAt: new Date('2030-01-01T00:00:00Z'),
          rawScopes: [],
          assertedTenantIds: [tenantId],
          assertedProjectIds: [],
        },
      })),
    authorize:
      options?.authorize ??
      (async () => ({
        ok: true,
        context: {
          principal: {
            principalId,
            principalType,
          },
          scope: { tenantId: { value: tenantId } },
          action: { kind: 'command', name: actionName },
          requestId,
          authorizedAt: new Date('2026-04-03T00:00:00Z'),
        },
      })),
  });
}

async function injectRebuildSnapshot(
  app: ReturnType<typeof Fastify>,
  runId: string,
  payload: unknown
): ReturnType<ReturnType<typeof Fastify>['inject']> {
  return app.inject({
    method: 'POST',
    url: `/admin/runs/${runId}/rebuild-snapshot`,
    payload,
  });
}

describe('adminRoutes', () => {
  it('returns 401 when token is missing or invalid', async () => {
    const { app, rebuildSnapshotSpy } = buildAuthorizedApp(
      async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'),
      {
        authenticateBearerToken: async () => ({ ok: false, code: 'MISSING_TOKEN' }),
      }
    );

    try {
      const response = await injectRebuildSnapshot(app, 'r1', { tenantId: 'tenant-a' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: {
          type: 'unauthorized',
          reason: 'missing_token',
        },
      });
      expect(rebuildSnapshotSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('returns 403 when principal lacks explicit admin action', async () => {
    const { app, rebuildSnapshotSpy } = buildAuthorizedApp(
      async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'),
      {
        authorize: async () => ({ ok: false, reason: 'ACTION_NOT_GRANTED' }),
      }
    );

    try {
      const response = await injectRebuildSnapshot(app, 'r1', { tenantId: 'tenant-a' });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          type: 'forbidden',
          reason: 'action_not_granted',
        },
      });
      expect(rebuildSnapshotSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('returns 403 when authorization context is not an admin action', async () => {
    const { app, rebuildSnapshotSpy } = buildAuthorizedApp(
      async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'),
      {
        auth: { actionName: 'run:cancel' },
      }
    );

    try {
      const response = await injectRebuildSnapshot(app, 'r1', { tenantId: 'tenant-a' });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          type: 'forbidden',
          reason: 'action_not_granted',
        },
      });
      expect(rebuildSnapshotSpy).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('returns 400 when tenantId is missing', async () => {
    const { app } = buildAuthorizedApp(async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'));

    try {
      const response = await injectRebuildSnapshot(app, 'r1', {});

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
    const { app } = buildAuthorizedApp(async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'));

    try {
      const response = await injectRebuildSnapshot(app, 'r1', ['tenant-a']);

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
    const { app } = buildAuthorizedApp(async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'));

    try {
      const response = await injectRebuildSnapshot(app, 'r1', payload);

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

  it('returns 200 with rebuilt snapshot status', async () => {
    const { app } = buildAuthorizedApp(async (_tenantId, runId) => makeSnapshot(runId, 'RUNNING'));

    try {
      const response = await injectRebuildSnapshot(app, 'r42', { tenantId: 'tenant-a' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ runId: 'r42', status: 'RUNNING' });
    } finally {
      await app.close();
    }
  });

  it('returns 404 when the run does not exist for the tenant', async () => {
    const { app } = buildAuthorizedApp(async (_tenantId, _runId) => {
      throw new RunNotFoundError('r404');
    });

    try {
      const response = await injectRebuildSnapshot(app, 'r404', { tenantId: 'tenant-a' });

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
    const { app } = buildAuthorizedApp(async (_tenantId, _runId) => {
      throw new Error('RUN_NOT_FOUND: r404');
    });

    try {
      const response = await injectRebuildSnapshot(app, 'r404', { tenantId: 'tenant-a' });

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
    const { app } = buildAuthorizedApp(async (_tenantId, _runId) => {
      throw new Error('db down');
    });

    try {
      const response = await injectRebuildSnapshot(app, 'r500', { tenantId: 'tenant-a' });

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
