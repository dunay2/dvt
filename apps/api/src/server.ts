import { pathToFileURL } from 'node:url';

import { buildApp } from './app.js';
import { createIntentReconcilerRuntime } from './runtime/intentReconcilerRuntime.js';
import {
  DEFAULT_RECONCILER_HEALTH_POLICY,
  bootstrapIntentReconciler,
  computeReconcilerHealthStaleMs,
  startReconcilerHealthWatchdog,
  withWatchdogSweepSignalHooks,
  type ReconcilerHealthWatchdog,
} from './runtime/reconcilerBootstrap.js';

export {
  DEFAULT_RECONCILER_HEALTH_POLICY,
  bootstrapIntentReconciler,
  buildReconcilerHealthHooks,
  computeReconcilerHealthStaleMs,
  evaluateAndMarkReconcilerHealthStale,
  shouldMarkReconcilerRuntimeUnavailable,
  startReconcilerHealthWatchdog,
  withWatchdogSweepSignalHooks,
} from './runtime/reconcilerBootstrap.js';

async function main(): Promise<void> {
  const { app, ctx } = await buildApp();
  let reconcilerRuntimePromise: Promise<Awaited<ReturnType<typeof bootstrapIntentReconciler>>> | null =
    null;
  let watchdog: ReconcilerHealthWatchdog | null = null;

  app.addHook('onClose', async () => {
    if (watchdog) {
      watchdog.stop();
      watchdog = null;
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

  const createRuntimeWithHealthSignal = withWatchdogSweepSignalHooks(
    createIntentReconcilerRuntime,
    () => watchdog
  );
  reconcilerRuntimePromise = bootstrapIntentReconciler(ctx, app.log, createRuntimeWithHealthSignal);

  const reconcilerRuntime = await reconcilerRuntimePromise;
  if (reconcilerRuntime === null) return;

  const staleMs = computeReconcilerHealthStaleMs(ctx.env, DEFAULT_RECONCILER_HEALTH_POLICY);
  const pollMs = Math.max(
    DEFAULT_RECONCILER_HEALTH_POLICY.minWatchdogPollMs,
    Math.floor(staleMs / DEFAULT_RECONCILER_HEALTH_POLICY.watchdogPollDivisor)
  );
  watchdog = startReconcilerHealthWatchdog(
    {
      getIntentReconcilerHealth: ctx.getIntentReconcilerHealth,
      setIntentReconcilerHealth: ctx.setIntentReconcilerHealth,
      observability: ctx.observability,
    },
    app.log,
    { staleMs, pollMs }
  );
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
