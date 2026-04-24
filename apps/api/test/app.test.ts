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
});
