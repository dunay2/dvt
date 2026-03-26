import type { FastifyBaseLogger } from 'fastify';

import type { AppContext } from '../app.js';
import {
  createIntentReconcilerRuntime,
  type IntentReconcilerRuntimeHandle,
  type ReconcilerRuntimeHealthHooks,
} from './intentReconcilerRuntime.js';
import type { ReconcilerHealthState } from './reconcilerHealth.js';

type ReconcilerBootstrapContext = Pick<
  AppContext,
  'env' | 'observability' | 'setIntentReconcilerHealth'
>;
type ReconcilerHealthReadContext = Pick<
  AppContext,
  'getIntentReconcilerHealth' | 'setIntentReconcilerHealth' | 'observability'
>;
type IntervalHandle = ReturnType<typeof setInterval>;

export type CreateIntentReconcilerRuntime = (
  env: AppContext['env'],
  logger: FastifyBaseLogger,
  observability: AppContext['observability'],
  healthHooks?: ReconcilerRuntimeHealthHooks
) => Promise<IntentReconcilerRuntimeHandle | null>;

export type ReconcilerHealthPolicy = {
  staleMultiplier: number;
  minWatchdogPollMs: number;
  watchdogPollDivisor: number;
};
type ReconcilerHealthStaleWindow = {
  staleMs: number;
  lastSweepSignalAtMs: number;
  nowMs: number;
};
type ReconcilerHealthWatchdogConfig = {
  staleMs: number;
  pollMs: number;
};

export const DEFAULT_RECONCILER_HEALTH_POLICY: ReconcilerHealthPolicy = Object.freeze({
  staleMultiplier: 3,
  minWatchdogPollMs: 1_000,
  watchdogPollDivisor: 2,
});

export function computeReconcilerHealthStaleMs(
  env: AppContext['env'],
  policy: ReconcilerHealthPolicy = DEFAULT_RECONCILER_HEALTH_POLICY
): number {
  return Math.max(
    env.DVT_INTENT_RECONCILER_INTERVAL_MS * policy.staleMultiplier,
    env.DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS + env.DVT_INTENT_RECONCILER_BACKOFF_MAX_MS
  );
}

export function shouldMarkReconcilerRuntimeUnavailable(
  current: ReconcilerHealthState,
  window: ReconcilerHealthStaleWindow
): boolean {
  if (current.status === 'disabled' || current.status === 'degraded') {
    return false;
  }
  return window.nowMs - window.lastSweepSignalAtMs > window.staleMs;
}

export function evaluateAndMarkReconcilerHealthStale(
  ctx: ReconcilerHealthReadContext,
  logger: FastifyBaseLogger,
  window: ReconcilerHealthStaleWindow
): boolean {
  const currentHealth = ctx.getIntentReconcilerHealth();
  if (!shouldMarkReconcilerRuntimeUnavailable(currentHealth, window)) {
    return false;
  }
  ctx.setIntentReconcilerHealth({ status: 'degraded', reasonCode: 'runtime_unavailable' });
  ctx.observability.metrics.counter('dvt.intent.reconcile.health_stale_total').add(1);
  logger.error(
    {
      staleMs: window.staleMs,
      lastSweepSignalAtMs: window.lastSweepSignalAtMs,
      nowMs: window.nowMs,
    },
    'intent reconciler health stale: no sweep signal within threshold'
  );
  return true;
}

export type ReconcilerHealthWatchdog = {
  markSweepSignal: () => void;
  stop: () => void;
};

type ReconcilerHealthWatchdogDeps = {
  now: () => number;
  setInterval: (handler: () => void, timeout?: number) => IntervalHandle;
  clearInterval: (handle: IntervalHandle) => void;
};

const DEFAULT_WATCHDOG_DEPS: ReconcilerHealthWatchdogDeps = {
  now: () => Date.now(),
  setInterval: (handler: () => void, timeout?: number): IntervalHandle =>
    setInterval(handler, timeout),
  clearInterval: (handle: IntervalHandle): void => clearInterval(handle),
};

export function startReconcilerHealthWatchdog(
  ctx: ReconcilerHealthReadContext,
  logger: FastifyBaseLogger,
  config: ReconcilerHealthWatchdogConfig,
  deps: ReconcilerHealthWatchdogDeps = DEFAULT_WATCHDOG_DEPS
): ReconcilerHealthWatchdog {
  let lastSweepSignalAtMs = deps.now();
  const interval = deps.setInterval(() => {
    evaluateAndMarkReconcilerHealthStale(ctx, logger, {
      staleMs: config.staleMs,
      lastSweepSignalAtMs,
      nowMs: deps.now(),
    });
  }, config.pollMs);
  interval.unref?.();

  return {
    markSweepSignal: () => {
      lastSweepSignalAtMs = deps.now();
    },
    stop: () => {
      deps.clearInterval(interval);
    },
  };
}

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
    logger.error({ err }, 'intent reconciler bootstrap failed');
    return null;
  }
}
