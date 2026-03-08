import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';

import { LoggingEventBus } from '../bus/LoggingEventBus.js';
import { getPgPool } from '../db/pool.js';
import type { Env } from '../plugins/env.js';

import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeLogger,
} from './OutboxWorkerRuntime.js';

export interface RuntimeHandle {
  start(signal?: AbortSignal): Promise<void>;
  stop(): Promise<void>;
}

export async function createOutboxWorkerRuntime(
  env: Env,
  logger: OutboxWorkerRuntimeLogger
): Promise<RuntimeHandle> {
  const pool = getPgPool(env.DATABASE_URL);
  const stateStore = new PostgresStateStoreAdapter({
    pool,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });

  await stateStore.migrate();

  const runtime = new OutboxWorkerRuntime(
    stateStore,
    createEventBus(env, logger),
    logger,
    {
      batchSize: env.DVT_OUTBOX_WORKER_BATCH_SIZE,
      stopOnError: env.DVT_OUTBOX_WORKER_STOP_ON_ERROR,
      pollIntervalMs: env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS,
      errorBackoffMs: env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS,
    }
  );

  return {
    start: (signal?: AbortSignal) => runtime.start(signal),
    stop: async () => {
      await runtime.stop();
      await stateStore.close();
    },
  };
}

function createEventBus(env: Env, logger: OutboxWorkerRuntimeLogger): LoggingEventBus {
  switch (env.DVT_OUTBOX_EVENT_BUS_MODE) {
    case 'log':
      return new LoggingEventBus(logger);
  }
}
