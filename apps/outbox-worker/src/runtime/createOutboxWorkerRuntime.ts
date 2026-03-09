import adapterPostgres from '@dvt/adapter-postgres';
import type { IEventBus, OutboxWorkerObserver } from '@dvt/engine';

import { HttpEventBus } from '../bus/HttpEventBus.js';
import { LoggingEventBus } from '../bus/LoggingEventBus.js';
import { acquirePgPool } from '../db/pool.js';
import type { Env } from '../plugins/env.js';

import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeHooks,
  type OutboxWorkerRuntimeLogger,
} from './OutboxWorkerRuntime.js';

const { PostgresStateStoreAdapter } = adapterPostgres as typeof import('@dvt/adapter-postgres');

export interface RuntimeHandle {
  start(signal?: globalThis.AbortSignal): Promise<void>;
  stop(): Promise<void>;
}

export interface CreateOutboxWorkerRuntimeOptions {
  observer?: OutboxWorkerObserver;
  hooks?: OutboxWorkerRuntimeHooks;
}

interface ClosableStateStore {
  close(): Promise<void>;
}

export async function createOutboxWorkerRuntime(
  env: Env,
  logger: OutboxWorkerRuntimeLogger,
  options: CreateOutboxWorkerRuntimeOptions = {}
): Promise<RuntimeHandle> {
  const runMigrations = env.DVT_OUTBOX_WORKER_RUN_MIGRATIONS;
  const poolLease = acquirePgPool({
    connectionString: env.DATABASE_URL,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const stateStore = new PostgresStateStoreAdapter({
    pool: poolLease.pool,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
    assumeSchemaReady: !runMigrations,
  });

  try {
    if (runMigrations) {
      await stateStore.migrate();
    }

    const runtime = new OutboxWorkerRuntime(stateStore, createEventBus(env, logger), logger, {
      batchSize: env.DVT_OUTBOX_WORKER_BATCH_SIZE,
      stopOnError: env.DVT_OUTBOX_WORKER_STOP_ON_ERROR,
      pollIntervalMs: env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS,
      errorBackoffMs: env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS,
      ...(options.observer ? { observer: options.observer } : {}),
      ...(options.hooks ? { hooks: options.hooks } : {}),
    });
    let stopPromise: Promise<void> | null = null;

    return {
      start: (signal?: globalThis.AbortSignal) => runtime.start(signal),
      stop: () =>
        (stopPromise ??= stopRuntimeResources({
          runtime,
          stateStore,
          poolLease,
        })),
    };
  } catch (error) {
    await safelyReleaseStartupResources(stateStore, poolLease);
    throw error;
  }
}

function createEventBus(env: Env, logger: OutboxWorkerRuntimeLogger): IEventBus {
  switch (env.DVT_OUTBOX_EVENT_BUS_MODE) {
    case 'http':
      return new HttpEventBus({
        targetUrl: env.DVT_OUTBOX_HTTP_TARGET_URL!,
        timeoutMs: env.DVT_OUTBOX_HTTP_TIMEOUT_MS,
        serviceName: env.SERVICE_NAME,
        ...(env.DVT_OUTBOX_HTTP_BEARER_TOKEN
          ? { bearerToken: env.DVT_OUTBOX_HTTP_BEARER_TOKEN }
          : {}),
      });
    case 'log':
      return new LoggingEventBus(logger);
  }
}

async function safelyReleaseStartupResources(
  stateStore: ClosableStateStore,
  poolLease: { release(): Promise<void> }
): Promise<void> {
  try {
    await stateStore.close();
  } catch {
    // Cleanup must not mask the startup failure.
  }

  try {
    await poolLease.release();
  } catch {
    // Cleanup must not mask the startup failure.
  }
}

async function stopRuntimeResources(deps: {
  runtime: Pick<RuntimeHandle, 'stop'>;
  stateStore: ClosableStateStore;
  poolLease: { release(): Promise<void> };
}): Promise<void> {
  let firstError: unknown = null;

  try {
    await deps.runtime.stop();
  } catch (error) {
    firstError ??= error;
  }

  try {
    await deps.stateStore.close();
  } catch (error) {
    firstError ??= error;
  }

  try {
    await deps.poolLease.release();
  } catch (error) {
    firstError ??= error;
  }

  if (firstError) {
    throw firstError;
  }
}
