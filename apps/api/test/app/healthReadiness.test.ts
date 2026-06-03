import { describe, expect, it, vi } from 'vitest';

import { HTTP_STATUS } from '../../src/routes/healthContract.js';

import {
  BASE_APP_ENV,
  DATABASE_APP_ENV,
  READYZ_ENABLED_ENV,
  RECONCILER_ENABLED_ENV,
  mergeEnv,
  withAppEnv,
} from './appEnvTestSupport.js';
import {
  expectDegradedIntentReconcilerHealth,
  expectIntentReconcilerHealth,
  expectUnavailableReadyz,
} from './healthReadinessAppTestSupport.js';
import {
  withMockedPgPool,
  withProtectedRuntimeApp,
} from './protectedRuntimeAppTestSupport.js';

describe('buildApp health and readiness', () => {
  it('returns 503 on /readyz when database dependency is not configured', async () => {
    await expectUnavailableReadyz({
      env: mergeEnv(BASE_APP_ENV, READYZ_ENABLED_ENV),
      reasonCode: 'database_not_configured',
    });
  });

  it('returns 503 on /readyz while reconciler is starting', async () => {
    await expectUnavailableReadyz({
      env: mergeEnv(BASE_APP_ENV, READYZ_ENABLED_ENV, DATABASE_APP_ENV, RECONCILER_ENABLED_ENV),
      reasonCode: 'reconciler_starting',
    });
  });

  it('returns 503 on /readyz when reconciler is degraded', async () => {
    await expectUnavailableReadyz({
      env: mergeEnv(BASE_APP_ENV, READYZ_ENABLED_ENV, DATABASE_APP_ENV, RECONCILER_ENABLED_ENV),
      reasonCode: 'reconciler_degraded',
      configure: ({ ctx }) =>
        ctx.setIntentReconcilerHealth({
          status: 'degraded',
          reasonCode: 'runtime_unavailable',
        }),
    });
  });

  it('emits structured readiness event when database probe fails', async () => {
    const queryMock = vi.fn(async () => {
      throw new Error('database probe failed');
    });

    await withMockedPgPool(queryMock, async () => {
      await withAppEnv(
        mergeEnv(BASE_APP_ENV, READYZ_ENABLED_ENV, DATABASE_APP_ENV),
        async ({ app }) => {
          const warnSpy = vi.spyOn(app.log, 'warn');
          const res = await app.inject({
            method: 'GET',
            url: '/readyz',
          });

          expect(res.statusCode).toBe(HTTP_STATUS.serviceUnavailable);
          expect(res.json()).toEqual({
            ok: false,
            status: 'not_ready',
            reasonCode: 'database_unavailable',
          });
          expect(warnSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              event: 'api.health.readiness.database_probe_failed',
            })
          );
          expect(queryMock).toHaveBeenCalledOnce();
        }
      );
    });
  });

  it('returns 200 on /readyz when all probes pass', async () => {
    const queryMock = vi.fn(async () => ({ rows: [{ ok: 1 }] }));

    await withProtectedRuntimeApp(
      async ({ app }) => {
        const res = await app.inject({
          method: 'GET',
          url: '/readyz',
        });

        expect(res.statusCode).toBe(HTTP_STATUS.ok);
        expect(res.json()).toEqual({
          ok: true,
          status: 'ready',
        });
        expect(queryMock).toHaveBeenCalledOnce();
      },
      {
        env: mergeEnv(READYZ_ENABLED_ENV, { DVT_INTENT_RECONCILER_ENABLED: undefined }),
        queryMock,
      }
    );
  });

  it('surfaces degraded intent reconciler state in health response', async () => {
    await expectDegradedIntentReconcilerHealth('bootstrap_failed');
  });

  it('surfaces runtime_unavailable reason code for degraded reconciler state', async () => {
    await expectDegradedIntentReconcilerHealth('runtime_unavailable');
  });

  it('reports starting reconciler status without exposing reason details', async () => {
    await expectIntentReconcilerHealth({
      expectedPayload: {
        ok: true,
        status: 'healthy',
        components: {
          intentReconciler: {
            status: 'starting',
          },
        },
      },
      hiddenProperties: ['reasonCode', 'reason'],
    });
  });
});
