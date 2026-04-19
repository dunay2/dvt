import { PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import type { OutboxWorkerObserver } from '@dvt/delivery';

import { acquirePgPool } from '../db/pool.js';
import type { ActiveEnv } from '../plugins/env.js';

import { buildDeliveryBufferPurgeRuntime } from './buildDeliveryBufferPurgeRuntime.js';
import { buildRunEventRetentionRuntime } from './buildRunEventRetentionRuntime.js';
import { createOutboxEventBus } from './createOutboxEventBus.js';
import {
  interruptPendingTick,
  safelyReleaseStartupResources,
  stopOutboxRuntimeResources,
  waitForOutboxRuntimeStartupOrAbort,
} from './outboxRuntimeResourceLifecycle.js';
import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeHooks,
  type OutboxWorkerRuntimeLogger,
} from './OutboxWorkerRuntime.js';
import type { RunEventRetentionRuntimeHooks } from './RunEventRetentionRuntime.js';

export interface RuntimeHandle {
  start(signal?: globalThis.AbortSignal): Promise<void>;
  stop(): Promise<void>;
}

export interface CreateOutboxWorkerRuntimeOptions {
  observer?: OutboxWorkerObserver;
  hooks?: OutboxWorkerRuntimeHooks;
  retentionHooks?: RunEventRetentionRuntimeHooks;
  shutdownSignal?: globalThis.AbortSignal;
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
  const eventBus = createOutboxEventBus(env, logger);

  try {
    await waitForOutboxRuntimeStartupOrAbort(
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
      ? buildDeliveryBufferPurgeRuntime(env, poolLease.pool, logger)
      : null;
    const retentionRuntime = env.DVT_RUN_EVENT_RETENTION_ENABLED
      ? buildRunEventRetentionRuntime(env, poolLease.pool, logger, options.retentionHooks)
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
        (stopPromise ??=
          stopOutboxRuntimeResources({
            runtimes: [runtime, purgeRuntime, retentionRuntime],
            stateStore,
            poolLease,
          })),
    };
  } catch (error) {
    await safelyReleaseStartupResources(stateStore, poolLease);
    throw error;
  }
}
