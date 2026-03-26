import { pathToFileURL } from 'node:url';

import { buildApp } from './app.js';
import { createIntentReconcilerRuntime } from './runtime/intentReconcilerRuntime.js';
import {
  DEFAULT_RECONCILER_HEALTH_POLICY,
  computeReconcilerHealthPollMs,
  computeReconcilerHealthStaleMs,
} from './runtime/reconcilerHealthPolicy.js';
import {
  startReconcilerHealthWatchdog,
  type ReconcilerHealthWatchdog,
} from './runtime/reconcilerHealthWatchdog.js';
import {
  bootstrapIntentReconciler,
  withWatchdogSweepSignalHooks,
} from './runtime/reconcilerRuntimeBootstrap.js';

const SERVER_LOG_EVENTS = {
  listening: 'api.server.listening',
} as const;

async function main(): Promise<void> {
  const { app, ctx } = await buildApp();
  let reconcilerRuntimePromise: Promise<
    Awaited<ReturnType<typeof bootstrapIntentReconciler>>
  > | null = null;
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
  app.log.info({ event: SERVER_LOG_EVENTS.listening, address });

  const createRuntimeWithHealthSignal = withWatchdogSweepSignalHooks(
    createIntentReconcilerRuntime,
    () => watchdog
  );
  reconcilerRuntimePromise = bootstrapIntentReconciler(ctx, app.log, createRuntimeWithHealthSignal);

  const reconcilerRuntime = await reconcilerRuntimePromise;
  if (reconcilerRuntime === null) return;

  const staleMs = computeReconcilerHealthStaleMs(ctx.env, DEFAULT_RECONCILER_HEALTH_POLICY);
  const pollMs = computeReconcilerHealthPollMs(staleMs, DEFAULT_RECONCILER_HEALTH_POLICY);
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
