import process from 'node:process';

import pino from 'pino';

import { loadEnv } from './plugins/env.js';
import { createOutboxWorkerRuntime } from './runtime/createOutboxWorkerRuntime.js';

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: env.SERVICE_NAME },
  });

  const runtime = await createOutboxWorkerRuntime(env, logger);
  const shutdown = new AbortController();

  const handleSignal = (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'shutdown signal received');
    shutdown.abort();
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));

  try {
    logger.info({ busMode: env.DVT_OUTBOX_EVENT_BUS_MODE }, 'outbox worker bootstrapped');
    await runtime.start(shutdown.signal);
  } finally {
    await runtime.stop();
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
