import { createServer } from 'node:http';
import process from 'node:process';

import { LineageWorkerRuntime } from '@dvt/traceability-service';
import pino from 'pino';

import { buildLineageWorkerBootstrap } from './bootstrap.js';
import { loadEnv } from './env.js';
import { createStepStartedLineageMapper } from './lineageMapper.js';

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: env.SERVICE_NAME },
  });

  const mapper = createStepStartedLineageMapper(env);
  const bootstrap = buildLineageWorkerBootstrap(env);
  const { stateStore, sink, getLineageStore } = bootstrap;
  const shutdown = new globalThis.AbortController();
  let runtime: LineageWorkerRuntime | undefined;
  const adminServer = createServer((_req, res) => {
    const lag = runtime?.lagCount ?? 0;
    const deadLetterLag = runtime?.deadLetterCount ?? null;
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, lag, deadLetterLag, service: env.SERVICE_NAME }));
  });

  let adminServerStarted = false;

  try {
    await stateStore.migrate();
    const lineageStore = getLineageStore();

    const runtimeOptions = {
      batchSize: env.DVT_LINEAGE_BATCH_SIZE,
      pollIntervalMs: env.DVT_LINEAGE_POLL_INTERVAL_MS,
      errorBackoffMs: env.DVT_LINEAGE_ERROR_BACKOFF_MS,
      deadLetterAlertThreshold: env.DVT_LINEAGE_DLQ_ALERT_THRESHOLD,
      autoReplayEnabled: env.DVT_LINEAGE_DLQ_AUTO_REPLAY_ENABLED,
      autoReplayBatchSize: env.DVT_LINEAGE_DLQ_AUTO_REPLAY_BATCH_SIZE,
      ...(env.DVT_LINEAGE_DLQ_ALERT_TENANT_ID === undefined
        ? {}
        : { deadLetterTenantId: env.DVT_LINEAGE_DLQ_ALERT_TENANT_ID }),
    };

    runtime = new LineageWorkerRuntime(lineageStore, sink, mapper, logger, runtimeOptions);

    await new Promise<void>((resolve, reject) => {
      adminServer.once('error', reject);
      adminServer.listen(env.DVT_LINEAGE_ADMIN_PORT, env.DVT_LINEAGE_ADMIN_HOST, () => {
        adminServer.off('error', reject);
        resolve();
      });
    });
    adminServerStarted = true;

    logger.info(
      { host: env.DVT_LINEAGE_ADMIN_HOST, port: env.DVT_LINEAGE_ADMIN_PORT },
      'lineage worker admin server listening'
    );

    const handleSignal = (signal: NodeJS.Signals): void => {
      logger.info({ signal }, 'shutdown signal received');
      shutdown.abort();
    };

    process.once('SIGINT', () => handleSignal('SIGINT'));
    process.once('SIGTERM', () => handleSignal('SIGTERM'));

    await runtime.start(shutdown.signal);
  } finally {
    if (adminServerStarted) {
      await new Promise<void>((resolve) => adminServer.close(() => resolve()));
    }
    await bootstrap.close();
    logger.info({}, 'lineage worker shutdown complete');
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
