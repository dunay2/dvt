import { describe, expect, it } from 'vitest';

import {
  ADMIN_ROUTES_ENABLED_ENV,
  BASE_APP_ENV,
  PARTIAL_OIDC_APP_ENV,
  PROTECTED_RUNTIME_DISABLED_ENV,
  mergeEnv,
  withAppEnv,
} from './appEnvTestSupport.js';
import { buildCompilePayload, buildPreviewPayload, httpError } from './appRoutePayloads.js';
import {
  expectProtectedRouteRequiresBearer,
  injectProtectedRouteMountChecks,
} from './protectedRouteMountTestSupport.js';
import { withProtectedRuntimeApp } from './protectedRuntimeAppTestSupport.js';

describe('buildApp protected route mounting', () => {
  it('does not register protected routes when admin routes are flagged on without OIDC config', async () => {
    await withAppEnv(
      mergeEnv(BASE_APP_ENV, ADMIN_ROUTES_ENABLED_ENV, PROTECTED_RUNTIME_DISABLED_ENV),
      async ({ app }) => {
        await injectProtectedRouteMountChecks(app, {
          runId: 'run-1',
          planId: 'plan-a',
          sha256: 'a'.repeat(64),
        });
      }
    );
  });

  it('keeps protected routes disabled when OIDC configuration is only partially present', async () => {
    await withAppEnv(
      mergeEnv(
        BASE_APP_ENV,
        ADMIN_ROUTES_ENABLED_ENV,
        PROTECTED_RUNTIME_DISABLED_ENV,
        PARTIAL_OIDC_APP_ENV
      ),
      async ({ app }) => {
        await injectProtectedRouteMountChecks(app, {
          runId: 'run-2',
          planId: 'plan-b',
          sha256: 'b'.repeat(64),
        });
      }
    );
  });

  it('wires DVT_SIGNAL_ROUTE_ALLOW_CANCEL into /runs/:runId/signal parsing', async () => {
    await withProtectedRuntimeApp(
      async ({ app }) => {
        const response = await app.inject({
          method: 'POST',
          url: '/runs/run-1/signal',
          payload: {
            tenantId: 'tenant-a',
            signalType: 'CANCEL',
          },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual(
          httpError('bad_request', 'invalid_signal_type', 'signalType')
        );
      },
      { env: { DVT_SIGNAL_ROUTE_ALLOW_CANCEL: 'false' } }
    );
  });

  it('mounts /plans/preview only behind protected runtime auth and returns typed missing token', async () => {
    await expectProtectedRouteRequiresBearer({
      url: '/plans/preview',
      payload: {
        ...buildPreviewPayload('run-preview-1'),
        previewProfile: 'planner-generic-v1',
      },
    });
  });

  it('mounts /plans/compile only behind protected runtime auth and returns typed missing token', async () => {
    await expectProtectedRouteRequiresBearer({
      url: '/plans/compile',
      payload: buildCompilePayload(),
    });
  });
});
