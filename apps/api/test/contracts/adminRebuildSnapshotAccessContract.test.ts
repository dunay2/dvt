import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION } from '@dvt/contracts';
import type { IRunStateStoreMaintenance } from '@dvt/engine';
import { RunNotFoundError } from '@dvt/engine';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { registerAdminRoutes } from '../../src/entrypoints/http/adminRoutes.js';

type RebuildSnapshot = IRunStateStoreMaintenance['rebuildSnapshot'];
type WorkflowSnapshotResult = Awaited<ReturnType<RebuildSnapshot>>;

function makeSnapshot(
  runId: string,
  status: WorkflowSnapshotResult['status'] = 'PENDING'
): WorkflowSnapshotResult {
  return {
    schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
    runId,
    status,
    schemaVersion: 'v1.2',
    paused: false,
    cancelling: false,
    steps: {},
  } as WorkflowSnapshotResult;
}

function createApp(
  rebuildSnapshot: RebuildSnapshot,
  options?: {
    readonly authorize?: () => Promise<unknown>;
  }
): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
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
    { rebuildSnapshot },
    {
      authenticator: {
        authenticateBearerToken: async () => ({
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
        }),
      } as never,
      authorizer: {
        authorize,
      } as never,
    }
  );
  return app;
}

describe('AdminRebuildSnapshot access contract', () => {
  it('exposes the documented success envelope', async () => {
    const app = createApp(async (_tenantId, runId) => makeSnapshot(runId, 'RUNNING'));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-1/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        runId: 'r-1',
        status: 'RUNNING',
      });
    } finally {
      await app.close();
    }
  });

  it('exposes bad_request envelope when tenantId is missing', async () => {
    const app = createApp(async (_tenantId, runId) => makeSnapshot(runId));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-2/rebuild-snapshot',
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

  it('exposes forbidden envelope for non-admin authorization', async () => {
    const app = createApp(async (_tenantId, runId) => makeSnapshot(runId), {
      authorize: async () => ({ ok: false, reason: 'ACTION_NOT_GRANTED' }),
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-2/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: {
          type: 'forbidden',
          reason: 'action_not_granted',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('exposes not_found envelope for missing run', async () => {
    const app = createApp(async (_tenantId, _runId) => {
      throw new RunNotFoundError('r-404');
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r-404/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: {
          type: 'not_found',
          reason: 'run_not_found',
          details: { runId: 'r-404' },
        },
      });
    } finally {
      await app.close();
    }
  });
});
