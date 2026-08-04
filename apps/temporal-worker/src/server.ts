import process from 'node:process';

import {
  DBT_STEP_REQUIRED_CAPABILITY,
  LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY,
} from '@dvt/contracts';
import pino from 'pino';

import { runTemporalWorkerHost } from './host/runTemporalWorkerHost.js';
import { createOperationalServer } from './ops/OperationalServer.js';
import { TemporalWorkerMonitor } from './ops/TemporalWorkerMonitor.js';
import { loadEnv } from './plugins/env.js';

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: env.SERVICE_NAME },
  });

  const monitor = new TemporalWorkerMonitor({
    serviceName: env.SERVICE_NAME,
    logger,
    enabledCapabilities: [
      ...(env.DVT_TEMPORAL_DBT_ENABLED ? [DBT_STEP_REQUIRED_CAPABILITY] : []),
      ...(env.DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED
        ? [LOAD_OBJECT_FILE_TO_POSTGRES_REQUIRED_CAPABILITY]
        : []),
    ],
  });
  const operationalServer = createOperationalServer({
    host: env.DVT_TEMPORAL_ADMIN_HOST,
    port: env.DVT_TEMPORAL_ADMIN_PORT,
    logger,
    monitor,
  });

  const shutdown = new globalThis.AbortController();
  const handleSignal = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutdown signal received');
    shutdown.abort();
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));

  await runTemporalWorkerHost({
    env,
    logger,
    monitor,
    operationalServer,
    shutdownSignal: shutdown.signal,
  });
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
