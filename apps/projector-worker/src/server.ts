import { createServer } from 'node:http';
import process from 'node:process';

import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import { ProjectorWorkerRuntime } from '@dvt/delivery';
import pino from 'pino';

import { loadEnv } from './env.js';

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: env.SERVICE_NAME },
  });

  const stateStore = new PostgresStateStoreAdapter({
    connectionString: env.DATABASE_URL,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });

  await stateStore.migrate();

  const runtime = new ProjectorWorkerRuntime(stateStore, logger, {
    batchSize: env.DVT_PROJECTOR_BATCH_SIZE,
    pollIntervalMs: env.DVT_PROJECTOR_POLL_INTERVAL_MS,
    errorBackoffMs: env.DVT_PROJECTOR_ERROR_BACKOFF_MS,
  });

  const adminServer = createServer((_req, res) => {
    const lag = runtime.lagCount;
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, lag, service: env.SERVICE_NAME }));
  });

  await new Promise<void>((resolve, reject) => {
    adminServer.once('error', reject);
    adminServer.listen(env.DVT_PROJECTOR_ADMIN_PORT, env.DVT_PROJECTOR_ADMIN_HOST, () => {
      adminServer.off('error', reject);
      resolve();
    });
  });

  logger.info(
    { host: env.DVT_PROJECTOR_ADMIN_HOST, port: env.DVT_PROJECTOR_ADMIN_PORT },
    'projector worker admin server listening'
  );

  const shutdown = new globalThis.AbortController();
  const handleSignal = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutdown signal received');
    shutdown.abort();
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));

  try {
    await runtime.start(shutdown.signal);
  } finally {
    await new Promise<void>((resolve) => adminServer.close(() => resolve()));
    await stateStore.close();
    logger.info({}, 'projector worker shutdown complete');
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
