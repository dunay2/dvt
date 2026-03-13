import { buildApp } from './app.js';
import { createIntentReconcilerRuntime } from './runtime/intentReconcilerRuntime.js';

async function main(): Promise<void> {
  const { app, ctx } = await buildApp();
  let reconcilerRuntimePromise: Promise<
    Awaited<ReturnType<typeof createIntentReconcilerRuntime>>
  > | null = null;

  app.addHook('onClose', async () => {
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

  reconcilerRuntimePromise = createIntentReconcilerRuntime(ctx.env, app.log, ctx.observability);
  try {
    const reconcilerRuntime = await reconcilerRuntimePromise;
    reconcilerRuntime?.start();
  } catch (err) {
    app.log.error({ err }, 'intent reconciler bootstrap failed');
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
