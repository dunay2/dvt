import { pathToFileURL } from 'node:url';

import { buildApp } from './app.js';
import type { FastifyBaseLogger } from 'fastify';

import type { AppContext } from './app.js';
import {
  createIntentReconcilerRuntime,
  type IntentReconcilerRuntimeHandle,
  type ReconcilerRuntimeHealthHooks,
} from './runtime/intentReconcilerRuntime.js';
import type { ReconcilerHealthState } from './runtime/reconcilerHealth.js';

type ReconcilerBootstrapContext = Pick<
  AppContext,
  'env' | 'observability' | 'setIntentReconcilerHealth'
>;
type ReconcilerHealthReadContext = Pick<
  AppContext,
  'getIntentReconcilerHealth' | 'setIntentReconcilerHealth' | 'observability'
>;

type CreateIntentReconcilerRuntime = (
  env: AppContext['env'],
  logger: FastifyBaseLogger,
  observability: AppContext['observability'],
  healthHooks?: ReconcilerRuntimeHealthHooks
) => Promise<IntentReconcilerRuntimeHandle | null>;

const RECONCILER_HEALTH_STALE_MULTIPLIER = 3;

export function computeReconcilerHealthStaleMs(env: AppContext['env']): number {
  return Math.max(
    env.DVT_INTENT_RECONCILER_INTERVAL_MS * RECONCILER_HEALTH_STALE_MULTIPLIER,
    env.DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS + env.DVT_INTENT_RECONCILER_BACKOFF_MAX_MS
  );
}

export function shouldMarkReconcilerRuntimeUnavailable(
  current: ReconcilerHealthState,
  lastSweepSignalAtMs: number,
  nowMs: number,
  staleMs: number
): boolean {
  if (current.status === 'disabled' || current.status === 'degraded') {
    return false;
  }
  return nowMs - lastSweepSignalAtMs > staleMs;
}

export function evaluateAndMarkReconcilerHealthStale(
  ctx: ReconcilerHealthReadContext,
  logger: FastifyBaseLogger,
  staleMs: number,
  lastSweepSignalAtMs: number,
  nowMs: number
): boolean {
  const currentHealth = ctx.getIntentReconcilerHealth();
  if (!shouldMarkReconcilerRuntimeUnavailable(currentHealth, lastSweepSignalAtMs, nowMs, staleMs)) {
    return false;
  }
  ctx.setIntentReconcilerHealth({ status: 'degraded', reasonCode: 'runtime_unavailable' });
  ctx.observability.metrics.counter('dvt.intent.reconcile.health_stale_total').add(1);
  logger.error(
    {
      staleMs,
      lastSweepSignalAtMs,
      nowMs,
    },
    'intent reconciler health stale: no sweep signal within threshold'
  );
  return true;
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

async function main(): Promise<void> {
  const { app, ctx } = await buildApp();
  let reconcilerRuntimePromise: Promise<IntentReconcilerRuntimeHandle | null> | null = null;
  let staleHealthCheckInterval: NodeJS.Timeout | null = null;
  let lastSweepSignalAtMs = Date.now();

  app.addHook('onClose', async () => {
    if (staleHealthCheckInterval) {
      clearInterval(staleHealthCheckInterval);
      staleHealthCheckInterval = null;
    }
    if (reconcilerRuntimePromise === null) return;
    try {
      const reconcilerRuntime = await reconcilerRuntimePromise;
      await reconcilerRuntime?.stop();
    } catch (err) {
      app.log.error({ err }, 'intent reconciler shutdown failed');
    }
  });

  const address = await app.listen({
    port: ctx.env.PORT,
    host: ctx.env.HOST,
  });

  app.log.info({ address }, 'server listening');

  const createRuntimeWithHealthSignal: CreateIntentReconcilerRuntime = (
    env,
    logger,
    observability,
    healthHooks = {}
  ) =>
    createIntentReconcilerRuntime(env, logger, observability, {
      onSweepSuccess: () => {
        lastSweepSignalAtMs = Date.now();
        healthHooks.onSweepSuccess?.();
      },
      onSweepFailure: () => {
        lastSweepSignalAtMs = Date.now();
        healthHooks.onSweepFailure?.();
      },
    });

  reconcilerRuntimePromise = bootstrapIntentReconciler(ctx, app.log, createRuntimeWithHealthSignal);
  const reconcilerRuntime = await reconcilerRuntimePromise;
  if (reconcilerRuntime === null) return;

  const staleMs = computeReconcilerHealthStaleMs(ctx.env);
  const pollMs = Math.max(1_000, Math.floor(staleMs / 2));
  staleHealthCheckInterval = setInterval(() => {
    const nowMs = Date.now();
    evaluateAndMarkReconcilerHealthStale(
      {
        getIntentReconcilerHealth: ctx.getIntentReconcilerHealth,
        setIntentReconcilerHealth: ctx.setIntentReconcilerHealth,
        observability: ctx.observability,
      },
      app.log,
      staleMs,
      lastSweepSignalAtMs,
      nowMs
    );
  }, pollMs);
  staleHealthCheckInterval.unref?.();
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectExecution()) {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
