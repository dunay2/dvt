import { PostgresDeliveryBufferPurgeStore, PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import type { IEventBus, OutboxWorkerObserver } from '@dvt/contracts';
import { DeliveryBufferPurger } from '@dvt/state-store';

import { HttpEventBus } from '../bus/HttpEventBus.js';
import { LoggingEventBus } from '../bus/LoggingEventBus.js';
import { acquirePgPool } from '../db/pool.js';
import type { ActiveEnv } from '../plugins/env.js';

import { DeliveryBufferPurgeRuntime } from './DeliveryBufferPurgeRuntime.js';
import { RunEventRetentionRuntime } from './RunEventRetentionRuntime.js';
import { buildRunEventRetentionRuntime } from './buildRunEventRetentionRuntime.js';
import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeHooks,
  type OutboxWorkerRuntimeLogger,
} from './OutboxWorkerRuntime.js';
import type { Pool } from 'pg';

export interface RuntimeHandle {
  start(signal?: globalThis.AbortSignal): Promise<void>;
  stop(): Promise<void>;
}

export interface CreateOutboxWorkerRuntimeOptions {
  observer?: OutboxWorkerObserver;
  hooks?: OutboxWorkerRuntimeHooks;
  shutdownSignal?: globalThis.AbortSignal;
}

interface ClosableStateStore {
  close(): Promise<void>;
}

interface InterruptibleEventBus extends IEventBus {
  abortPendingPublishes?(): void;
}

export async function createOutboxWorkerRuntime(
  env: ActiveEnv,
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
    outboxShardCount: env.DVT_OUTBOX_SHARD_COUNT,
  });
  const eventBus = createEventBus(env, logger);

  try {
    await waitForStartupOrAbort(
      async () => {
        if (runMigrations) {
          await stateStore.migrate();
        }
      },
      {
        stateStore,
        eventBus,
        ...(options.shutdownSignal ? { shutdownSignal: options.shutdownSignal } : {}),
      }
    );

    const runtime = new OutboxWorkerRuntime(stateStore, eventBus, logger, {
      batchSize: env.DVT_OUTBOX_WORKER_BATCH_SIZE,
      stopOnError: env.DVT_OUTBOX_WORKER_STOP_ON_ERROR,
      pollIntervalMs: env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS,
      errorBackoffMs: env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS,
      claimSelection: { shardIds: env.DVT_OUTBOX_OWNED_SHARD_IDS },
      interruptPendingTick: () => interruptPendingTick(stateStore, eventBus),
      ...(options.observer ? { observer: options.observer } : {}),
      ...(options.hooks ? { hooks: options.hooks } : {}),
    });

    const purgeRuntime = env.DVT_PURGE_ENABLED
      ? buildPurgeRuntime(env, poolLease.pool, logger)
      : null;
    const retentionRuntime = env.DVT_RUN_EVENT_RETENTION_ENABLED
      ? buildRunEventRetentionRuntime(env, poolLease.pool, logger)
      : null;

    let stopPromise: Promise<void> | null = null;

    return {
      start: (signal?: globalThis.AbortSignal) => {
        const starts: Promise<void>[] = [runtime.start(signal)];
        if (purgeRuntime) starts.push(purgeRuntime.start(signal));
        if (retentionRuntime) starts.push(retentionRuntime.start(signal));
        return Promise.all(starts).then(() => {});
      },
      stop: () =>
        (stopPromise ??= stopRuntimeResources({
          runtime,
          purgeRuntime,
          retentionRuntime,
          stateStore,
          poolLease,
        })),
    };
  } catch (error) {
    await safelyReleaseStartupResources(stateStore, poolLease);
    throw error;
  }
}

function createEventBus(env: ActiveEnv, logger: OutboxWorkerRuntimeLogger): InterruptibleEventBus {
  switch (env.DVT_OUTBOX_EVENT_BUS_MODE) {
    case 'http':
      return new HttpEventBus({
        targetUrl: env.DVT_OUTBOX_HTTP_TARGET_URL,
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

async function waitForStartupOrAbort(
  startup: () => Promise<void>,
  deps: {
    shutdownSignal?: globalThis.AbortSignal;
    stateStore: { abortPendingOperations(): void | Promise<void> };
    eventBus: InterruptibleEventBus;
  }
): Promise<void> {
  const signal = deps.shutdownSignal;
  if (!signal) {
    await startup();
    return;
  }

  if (signal.aborted) {
    await interruptPendingTick(deps.stateStore, deps.eventBus);
    throw createAbortError('outbox runtime startup aborted');
  }

  let detachAbortListener = (): void => {};
  const abortPromise = new Promise<never>((_resolve, reject) => {
    const onAbort = (): void => {
      detachAbortListener();
      void interruptPendingTick(deps.stateStore, deps.eventBus);
      reject(createAbortError('outbox runtime startup aborted'));
    };

    detachAbortListener = (): void => {
      signal.removeEventListener('abort', onAbort);
    };

    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
    }
  });

  try {
    await Promise.race([startup(), abortPromise]);
  } finally {
    detachAbortListener();
  }
}

async function interruptPendingTick(
  stateStore: { abortPendingOperations(): void | Promise<void> },
  eventBus: InterruptibleEventBus
): Promise<void> {
  eventBus.abortPendingPublishes?.();
  await Promise.resolve(stateStore.abortPendingOperations());
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
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

function buildPurgeRuntime(
  env: ActiveEnv,
  pool: Pool,
  logger: OutboxWorkerRuntimeLogger
): DeliveryBufferPurgeRuntime {
  const purgeStore = new PostgresDeliveryBufferPurgeStore(env.DVT_PG_SCHEMA, pool as never);
  const purger = new DeliveryBufferPurger({ store: purgeStore });
  const policy = {
    deliveredOutboxRetentionDays: env.DVT_PURGE_DELIVERED_OUTBOX_RETENTION_DAYS,
    outboxDeadLetterRetentionDays: env.DVT_PURGE_OUTBOX_DEAD_LETTER_RETENTION_DAYS,
    lineageDeadLetterRetentionDays: env.DVT_PURGE_LINEAGE_DEAD_LETTER_RETENTION_DAYS,
    maxRowsPerRun: env.DVT_PURGE_MAX_ROWS_PER_RUN,
  };
  return new DeliveryBufferPurgeRuntime(
    () => purger.purge(policy),
    env.DVT_PURGE_INTERVAL_MS,
    logger
  );
}

async function stopRuntimeResources(deps: {
  runtime: Pick<RuntimeHandle, 'stop'>;
  purgeRuntime: DeliveryBufferPurgeRuntime | null;
  retentionRuntime: RunEventRetentionRuntime | null;
  stateStore: ClosableStateStore;
  poolLease: { release(): Promise<void> };
}): Promise<void> {
  let firstError: unknown = null;

  try {
    await deps.runtime.stop();
  } catch (error) {
    firstError ??= error;
  }

  if (deps.purgeRuntime) {
    try {
      await deps.purgeRuntime.stop();
    } catch (error) {
      firstError ??= error;
    }
  }

  if (deps.retentionRuntime) {
    try {
      await deps.retentionRuntime.stop();
    } catch (error) {
      firstError ??= error;
    }
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
