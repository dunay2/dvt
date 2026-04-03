import type { IRunStateStoreMaintenance } from '@dvt/engine';
import { RunNotFoundError } from '@dvt/engine';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

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

function createApp(rebuildSnapshot: RebuildSnapshot): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
  registerAdminRoutes(app, {
    rebuildSnapshot,
  });
  return app;
}

describe('adminRoutes', () => {
  it('returns 400 when tenantId is missing', async () => {
    const app = createApp(async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
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
    const app = createApp(async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
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
    const app = createApp(async (_tenantId, _runId) => makeSnapshot('r1', 'PENDING'));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
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

  it('returns 200 with rebuilt snapshot status', async () => {
    const app = createApp(async (_tenantId, runId) => makeSnapshot(runId, 'RUNNING'));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r42/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ runId: 'r42', status: 'RUNNING' });
    } finally {
      await app.close();
    }
  });

  it('returns 404 when the run does not exist for the tenant', async () => {
    const app = createApp(async (_tenantId, _runId) => {
      throw new RunNotFoundError('r404');
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r404/rebuild-snapshot',
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
    const app = createApp(async (_tenantId, _runId) => {
      throw new Error('RUN_NOT_FOUND: r404');
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r404/rebuild-snapshot',
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
    const app = createApp(async (_tenantId, _runId) => {
      throw new Error('db down');
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r500/rebuild-snapshot',
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
