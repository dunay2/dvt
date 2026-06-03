import process from 'node:process';

import pino from 'pino';

import { runOutboxWorkerHost } from './host/runOutboxWorkerHost.js';
import { createOperationalServer } from './ops/OperationalServer.js';
import { OutboxWorkerMonitor } from './ops/OutboxWorkerMonitor.js';
import { resolveReadyStaleAfterMs } from './ops/resolveReadyStaleAfterMs.js';
import { createPgShardOwnershipGate } from './ownership/PgShardOwnershipGate.js';
import { isActiveEnv, loadEnv } from './plugins/env.js';

async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const logger = pino({
    level: env.LOG_LEVEL,
    base: { service: env.SERVICE_NAME },
  });

  const monitor = new OutboxWorkerMonitor({
    serviceName: env.SERVICE_NAME,
    logger,
    ...(isActiveEnv(env)
      ? {
          readyStaleAfterMs: resolveReadyStaleAfterMs(env),
          purgeConfigured: env.DVT_PURGE_ENABLED,
          retentionConfigured: env.DVT_RUN_EVENT_RETENTION_ENABLED,
          filesystemArchiveStorageConfigured: env.DVT_RUN_EVENT_RETENTION_ENABLED,
        }
      : {}),
  });
  const operationalServer = createOperationalServer({
    host: env.DVT_OUTBOX_ADMIN_HOST,
    port: env.DVT_OUTBOX_ADMIN_PORT,
    logger,
    monitor,
  });
  const ownershipGate = isActiveEnv(env)
    ? createPgShardOwnershipGate({
        connectionString: env.DATABASE_URL,
        statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
        queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
        schema: env.DVT_PG_SCHEMA,
        shardIds: env.DVT_OUTBOX_OWNED_SHARD_IDS,
        logger,
      })
    : undefined;
  const shutdown = new globalThis.AbortController();

  const handleSignal = (signal: NodeJS.Signals): void => {
    logger.info({ signal }, 'shutdown signal received');
    shutdown.abort();
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));

  await runOutboxWorkerHost({
    env,
    logger,
    monitor,
    operationalServer,
    shutdownSignal: shutdown.signal,
    ...(ownershipGate ? { ownershipGate } : {}),
  });
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
