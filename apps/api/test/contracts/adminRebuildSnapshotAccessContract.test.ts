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
    runId,
    status,
    paused: false,
    cancelling: false,
    steps: {},
  };
}

function createApp(rebuildSnapshot: RebuildSnapshot): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
  registerAdminRoutes(app, { rebuildSnapshot });
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
