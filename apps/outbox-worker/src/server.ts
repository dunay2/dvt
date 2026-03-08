import process from 'node:process';

import pino from 'pino';

import { createOperationalServer } from './ops/OperationalServer.js';
import { OutboxWorkerMonitor } from './ops/OutboxWorkerMonitor.js';
import { loadEnv } from './plugins/env.js';
import { createOutboxWorkerRuntime } from './runtime/createOutboxWorkerRuntime.js';

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: env.SERVICE_NAME },
  });

  const monitor = new OutboxWorkerMonitor({
    serviceName: env.SERVICE_NAME,
    logger,
  });
  const operationalServer = createOperationalServer({
    host: env.DVT_OUTBOX_ADMIN_HOST,
    port: env.DVT_OUTBOX_ADMIN_PORT,
    logger,
    monitor,
  });
  const runtime = await createOutboxWorkerRuntime(env, logger, {
    observer: monitor,
    hooks: monitor,
  });
  const shutdown = new globalThis.AbortController();

  const handleSignal = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutdown signal received');
    shutdown.abort();
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));

  try {
    await operationalServer.start();
    logger.info(
      {
        busMode: env.DVT_OUTBOX_EVENT_BUS_MODE,
        adminHost: env.DVT_OUTBOX_ADMIN_HOST,
        adminPort: env.DVT_OUTBOX_ADMIN_PORT,
      },
      'outbox worker bootstrapped'
    );
    await runtime.start(shutdown.signal);
  } finally {
    await runtime.stop();
    await operationalServer.stop();
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
