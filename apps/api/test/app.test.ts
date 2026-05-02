import { describe, expect, it } from 'vitest';

import { HTTP_STATUS } from '../src/routes/healthContract.js';

import { BASE_APP_ENV, withAppEnv } from './app/appEnvTestSupport.js';

describe('buildApp composition root smoke', () => {
  it('wires observability and exposes health endpoint', async () => {
    await withAppEnv(BASE_APP_ENV, async ({ app, ctx }) => {
      expect(ctx.observability).toBeTruthy();

      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });

      expect(res.statusCode).toBe(HTTP_STATUS.ok);
      expect(res.json()).toEqual({
        ok: true,
        status: 'healthy',
        components: {
          intentReconciler: {
            status: 'disabled',
          },
        },
      });
    });
  });

  it('allows browser preflight for workspace graph draft writes', async () => {
    await withAppEnv(BASE_APP_ENV, async ({ app }) => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/workspace/graph/draft',
        headers: {
          origin: 'http://localhost:4174',
          'access-control-request-method': 'PUT',
          'access-control-request-headers': 'authorization,content-type,x-tenant-id,x-project-id',
        },
      });

      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-methods']).toContain('PUT');
      expect(res.headers['access-control-allow-headers']).toContain('authorization');
      expect(res.headers['access-control-allow-headers']).toContain('content-type');
      expect(res.headers['access-control-allow-headers']).toContain('x-tenant-id');
      expect(res.headers['access-control-allow-headers']).toContain('x-project-id');
    });
  });
});
