import { describe, it, expect } from 'vitest';

import Fastify from 'fastify';

import { registerAdminRoutes } from '../../../src/entrypoints/http/adminRoutes.js';

function createApp(
  rebuildSnapshot: (tenantId: string, runId: string) => Promise<unknown>
): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });
  registerAdminRoutes(app, {
    rebuildSnapshot,
  } as never);
  return app;
}

describe('adminRoutes', () => {
  it('returns 400 when tenantId is missing', async () => {
    const app = createApp(async () => ({ runId: 'r1', status: 'PENDING' }));

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r1/rebuild-snapshot',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'BAD_REQUEST', code: 'MISSING_TENANT_ID' });
    } finally {
      await app.close();
    }
  });

  it('returns 200 with rebuilt snapshot status', async () => {
    const app = createApp(async (_tenantId, runId) => ({
      runId,
      status: 'RUNNING',
    }));

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
    const app = createApp(async () => {
      throw new Error('RUN_NOT_FOUND: r404');
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r404/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'RUN_NOT_FOUND', runId: 'r404' });
    } finally {
      await app.close();
    }
  });

  it('returns 500 on unexpected rebuild failure', async () => {
    const app = createApp(async () => {
      throw new Error('db down');
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/runs/r500/rebuild-snapshot',
        payload: { tenantId: 'tenant-a' },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: 'INTERNAL_ERROR' });
    } finally {
      await app.close();
    }
  });
});
