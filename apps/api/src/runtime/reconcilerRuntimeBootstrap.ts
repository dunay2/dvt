import type { FastifyBaseLogger } from 'fastify';

import type { AppContext } from '../app.js';

import {
  createIntentReconcilerRuntime,
  type IntentReconcilerRuntimeHandle,
  type ReconcilerRuntimeHealthHooks,
} from './intentReconcilerRuntime.js';
import type { ReconcilerHealthState } from './reconcilerHealth.js';
import type { ReconcilerHealthWatchdog } from './reconcilerHealthWatchdog.js';

const RECONCILER_BOOTSTRAP_EVENTS = {
  bootstrapFailed: 'api.reconciler.bootstrap.failed',
} as const;

type ReconcilerBootstrapContext = Pick<
  AppContext,
  'env' | 'observability' | 'setIntentReconcilerHealth'
>;

export type CreateIntentReconcilerRuntime = (
  env: AppContext['env'],
  logger: FastifyBaseLogger,
  observability: AppContext['observability'],
  healthHooks?: ReconcilerRuntimeHealthHooks
) => Promise<IntentReconcilerRuntimeHandle | null>;

export function buildReconcilerHealthHooks(
  setIntentReconcilerHealth: (health: ReconcilerHealthState) => void
): ReconcilerRuntimeHealthHooks {
  return {
    onSweepFailure: () => {
      setIntentReconcilerHealth({ status: 'degraded', reasonCode: 'runtime_unavailable' });
    },
    onSweepSuccess: () => {
      setIntentReconcilerHealth({ status: 'healthy' });
    },
  };
}

export function withWatchdogSweepSignalHooks(
  createRuntime: CreateIntentReconcilerRuntime,
  getWatchdog: () => ReconcilerHealthWatchdog | null
): CreateIntentReconcilerRuntime {
  return (env, logger, observability, healthHooks = {}) =>
    createRuntime(env, logger, observability, {
      onSweepSuccess: () => {
        getWatchdog()?.markSweepSignal();
        healthHooks.onSweepSuccess?.();
      },
      onSweepFailure: () => {
        getWatchdog()?.markSweepSignal();
        healthHooks.onSweepFailure?.();
      },
    });
}

export async function bootstrapIntentReconciler(
  ctx: ReconcilerBootstrapContext,
  logger: FastifyBaseLogger,
  createRuntime: CreateIntentReconcilerRuntime = createIntentReconcilerRuntime
): Promise<IntentReconcilerRuntimeHandle | null> {
  const healthHooks = buildReconcilerHealthHooks(ctx.setIntentReconcilerHealth);
  try {
    const reconcilerRuntime = await createRuntime(ctx.env, logger, ctx.observability, healthHooks);
    if (reconcilerRuntime === null) {
      ctx.setIntentReconcilerHealth({ status: 'disabled' });
      return null;
    }
    reconcilerRuntime.start();
    // Keep "starting" until the first successful sweep confirms runtime availability.
    ctx.setIntentReconcilerHealth({ status: 'starting' });
    return reconcilerRuntime;
  } catch (err) {
    ctx.setIntentReconcilerHealth({ status: 'degraded', reasonCode: 'bootstrap_failed' });
    logger.error({ event: RECONCILER_BOOTSTRAP_EVENTS.bootstrapFailed, err });
    return null;
  }
}
