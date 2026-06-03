import { expect } from 'vitest';

import { HTTP_STATUS } from '../../src/routes/healthContract.js';
import type { ReconcilerHealthReasonCode } from '../../src/runtime/reconcilerHealth.js';

import {
  BASE_APP_ENV,
  DATABASE_APP_ENV,
  RECONCILER_ENABLED_ENV,
  type AppEnvPatch,
  type BuiltApp,
  mergeEnv,
  withAppEnv,
} from './appEnvTestSupport.js';

type ReadinessBody = {
  readonly ok: boolean;
  readonly status: string;
  readonly reasonCode?: string;
};

type IntentReconcilerHealth = {
  readonly components: {
    readonly intentReconciler: Record<string, unknown>;
  };
};

export async function expectReadyzResponse(args: {
  readonly env: AppEnvPatch;
  readonly statusCode: number;
  readonly body: ReadinessBody;
  readonly configure?: (built: BuiltApp) => void;
}): Promise<void> {
  await withAppEnv(args.env, async (built) => {
    args.configure?.(built);

    const res = await built.app.inject({
      method: 'GET',
      url: '/readyz',
    });

    expect(res.statusCode).toBe(args.statusCode);
    expect(res.json()).toEqual(args.body);
  });
}

export async function expectUnavailableReadyz(args: {
  readonly env: AppEnvPatch;
  readonly reasonCode: string;
  readonly configure?: (built: BuiltApp) => void;
}): Promise<void> {
  await expectReadyzResponse({
    env: args.env,
    statusCode: HTTP_STATUS.serviceUnavailable,
    body: {
      ok: false,
      status: 'not_ready',
      reasonCode: args.reasonCode,
    },
    ...(args.configure === undefined ? {} : { configure: args.configure }),
  });
}

export async function expectIntentReconcilerHealth(args: {
  readonly configure?: (built: BuiltApp) => void;
  readonly expectedPayload: Record<string, unknown>;
  readonly hiddenProperties: readonly string[];
}): Promise<void> {
  await withAppEnv(
    mergeEnv(BASE_APP_ENV, DATABASE_APP_ENV, RECONCILER_ENABLED_ENV),
    async (built) => {
      args.configure?.(built);

      const res = await built.app.inject({
        method: 'GET',
        url: '/healthz',
      });
      const payload = res.json() as IntentReconcilerHealth;

      expect(res.statusCode).toBe(HTTP_STATUS.ok);
      expect(payload).toEqual(args.expectedPayload);

      for (const property of args.hiddenProperties) {
        expect(payload.components.intentReconciler).not.toHaveProperty(property);
      }
    }
  );
}

export async function expectDegradedIntentReconcilerHealth(
  reasonCode: ReconcilerHealthReasonCode
): Promise<void> {
  await expectIntentReconcilerHealth({
    configure: ({ ctx }) =>
      ctx.setIntentReconcilerHealth({
        status: 'degraded',
        reasonCode,
      }),
    expectedPayload: {
      ok: true,
      status: 'degraded',
      components: {
        intentReconciler: {
          status: 'degraded',
          reasonCode,
        },
      },
    },
    hiddenProperties: ['reason'],
  });
}
