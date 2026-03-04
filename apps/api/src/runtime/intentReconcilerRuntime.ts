import { PostgresStartRunIntentStore, PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import {
  MockAdapter,
  IdempotencyKeyBuilder,
  IntentReconcilerWorker,
  type IntentReconcilerWorkerLogger,
  type IntentReconcilerWorkerMetrics,
  RunMaintenanceService,
  SnapshotProjector,
  type IClock,
  type IProviderAdapter,
} from '@dvt/engine';
import type { EngineRunRef } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import { getPgPool } from '../db/pool.js';
import type { Env } from '../plugins/env.js';

interface RuntimeHandle {
  start(): void;
  stop(): Promise<void>;
}

function resolveReconcilerAdapters(
  providersEnv: string,
  stateStore: PostgresStateStoreAdapter
): Map<EngineRunRef['provider'], IProviderAdapter> {
  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>();
  const providers = providersEnv
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);

  for (const provider of providers) {
    if (provider === 'mock') {
      adapters.set(
        'mock',
        new MockAdapter({
          stateStore,
          projector: new SnapshotProjector(),
        })
      );
      continue;
    }
    throw new Error(`UNSUPPORTED_RECONCILER_PROVIDER: ${provider}`);
  }

  return adapters;
}

export async function createIntentReconcilerRuntime(
  env: Env,
  logger: FastifyBaseLogger,
  observability: IObservability
): Promise<RuntimeHandle | null> {
  if (!env.DVT_INTENT_RECONCILER_ENABLED) {
    logger.info({ enabled: false }, 'intent reconciler disabled');
    return null;
  }
  if (!env.DATABASE_URL) {
    logger.warn('intent reconciler disabled: DATABASE_URL not set');
    return null;
  }

  const pool = getPgPool(env.DATABASE_URL);
  const stateStore = new PostgresStateStoreAdapter({
    pool,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const intentStore = new PostgresStartRunIntentStore({
    pool,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });

  await Promise.all([stateStore.migrate(), intentStore.migrate()]);
  const adapters = resolveReconcilerAdapters(env.DVT_INTENT_RECONCILER_PROVIDERS, stateStore);
  if (adapters.size === 0) {
    throw new Error('INTENT_RECONCILER_NO_PROVIDER_ADAPTERS');
  }

  const maintenance = new RunMaintenanceService({
    stateStore,
    intentStore,
    adapters,
    authorizer: { assertTenantAccess: async () => {} },
    clock: { nowIsoUtc: () => new Date().toISOString() } as IClock,
    idempotency: new IdempotencyKeyBuilder(),
    observability,
  });

  const worker = new IntentReconcilerWorker(
    maintenance,
    {
      info: (data) => logger.info(data, 'intent reconciler sweep'),
      error: (data) => logger.error(data, 'intent reconciler sweep failed'),
    } satisfies IntentReconcilerWorkerLogger,
    {
      increment: (name, value = 1) => {
        observability.metrics.counter(name).add(value);
      },
      timing: (name, valueMs) => {
        observability.metrics.histogram(name).record(valueMs);
      },
      gauge: (name, value) => {
        observability.metrics.gauge(name).set(value);
      },
    } satisfies IntentReconcilerWorkerMetrics,
    {
      intervalMs: env.DVT_INTENT_RECONCILER_INTERVAL_MS,
      orphanThresholdMs: env.DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS,
      limit: env.DVT_INTENT_RECONCILER_LIMIT,
      errorBackoffMsBase: env.DVT_INTENT_RECONCILER_BACKOFF_BASE_MS,
      errorBackoffMsMax: env.DVT_INTENT_RECONCILER_BACKOFF_MAX_MS,
      tickTimeoutMs: env.DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS,
    }
  );

  return {
    start: () => {
      worker.start();
      logger.info({ enabled: true }, 'intent reconciler started');
    },
    stop: async () => {
      await worker.stop();
      await Promise.all([stateStore.close(), intentStore.close()]);
      logger.info('intent reconciler stopped');
    },
  };
}
