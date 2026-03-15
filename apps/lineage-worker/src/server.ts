import { createServer } from 'node:http';
import process from 'node:process';

import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import { LineageWorkerRuntime } from '@dvt/delivery';
import {
  DVT_TRACEABILITY_FACET_PRODUCER,
  HttpOpenLineageSink,
  OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL,
  StepStartedLineageMapper,
} from '@dvt/traceability-service';
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

  const lineageStore = stateStore.lineageOutboxStore;

  const sink = new HttpOpenLineageSink({
    apiUrl: env.DVT_LINEAGE_API_URL,
    namespace: env.DVT_LINEAGE_NAMESPACE,
    ...(env.DVT_LINEAGE_API_TOKEN
      ? { headers: { authorization: `Bearer ${env.DVT_LINEAGE_API_TOKEN}` } }
      : {}),
  });

  // StepStartedLineageMapper requires a compiledCodeResolver; for the lineage
  // worker, resolution failures are fail-open (mapper returns baseFacets only).
  // Inject a no-op resolver — actual compiled code resolution is out of scope
  // for the delivery-layer worker.
  const noopResolver = {
    resolve: async () => {
      throw new Error('no compiled code resolver configured');
    },
  };
  const noopSqlFacetBuilder = {
    fromSql: (sql: string) => ({
      _producer: DVT_TRACEABILITY_FACET_PRODUCER,
      _schemaURL: OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL,
      query: sql,
    }),
  };
  const mapper = new StepStartedLineageMapper({
    compiledCodeResolver: noopResolver,
    sqlFacetBuilder: noopSqlFacetBuilder,
  });

  const runtime = new LineageWorkerRuntime(lineageStore, sink, mapper, logger, {
    batchSize: env.DVT_LINEAGE_BATCH_SIZE,
    pollIntervalMs: env.DVT_LINEAGE_POLL_INTERVAL_MS,
    errorBackoffMs: env.DVT_LINEAGE_ERROR_BACKOFF_MS,
  });

  const adminServer = createServer((_req, res) => {
    const lag = runtime.lagCount;
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, lag, service: env.SERVICE_NAME }));
  });

  await new Promise<void>((resolve, reject) => {
    adminServer.once('error', reject);
    adminServer.listen(env.DVT_LINEAGE_ADMIN_PORT, env.DVT_LINEAGE_ADMIN_HOST, () => {
      adminServer.off('error', reject);
      resolve();
    });
  });

  logger.info(
    { host: env.DVT_LINEAGE_ADMIN_HOST, port: env.DVT_LINEAGE_ADMIN_PORT },
    'lineage worker admin server listening'
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
    logger.info({}, 'lineage worker shutdown complete');
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
