import type { FastifyBaseLogger } from 'fastify';

import type { AppContext } from '../app.js';

import type { IntentReconcilerRuntimeHandle } from './intentReconcilerRuntime.js';
import { RECONCILER_HEALTH_REASON_CODE, RECONCILER_HEALTH_STATUS } from './reconcilerHealth.js';
import {
  buildReconcilerHealthHooks,
  DEFAULT_CREATE_INTENT_RECONCILER_RUNTIME,
  type CreateIntentReconcilerRuntime,
} from './reconcilerRuntimeHealthHooks.js';
import { RECONCILER_RUNTIME_EVENTS } from './reconcilerRuntimeTelemetry.js';

type ReconcilerBootstrapContext = Pick<
  AppContext,
  'env' | 'observability' | 'setIntentReconcilerHealth'
>;

export async function bootstrapIntentReconciler(
  ctx: ReconcilerBootstrapContext,
  logger: FastifyBaseLogger,
  createRuntime: CreateIntentReconcilerRuntime = DEFAULT_CREATE_INTENT_RECONCILER_RUNTIME
): Promise<IntentReconcilerRuntimeHandle | null> {
  const healthHooks = buildReconcilerHealthHooks(ctx.setIntentReconcilerHealth);
  try {
    const reconcilerRuntime = await createRuntime(ctx.env, logger, ctx.observability, healthHooks);
    if (reconcilerRuntime === null) {
      ctx.setIntentReconcilerHealth({ status: RECONCILER_HEALTH_STATUS.disabled });
      return null;
    }
    reconcilerRuntime.start();
    // Keep "starting" until the first successful sweep confirms runtime availability.
    ctx.setIntentReconcilerHealth({ status: RECONCILER_HEALTH_STATUS.starting });
    return reconcilerRuntime;
  } catch (err) {
    ctx.setIntentReconcilerHealth({
      status: RECONCILER_HEALTH_STATUS.degraded,
      reasonCode: RECONCILER_HEALTH_REASON_CODE.bootstrapFailed,
    });
    logger.error({ event: RECONCILER_RUNTIME_EVENTS.bootstrapFailed, err });
    return null;
  }
}
