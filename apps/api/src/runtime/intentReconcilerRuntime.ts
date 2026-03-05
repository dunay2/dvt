import { PostgresStartRunIntentStore, PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import type { EngineRunRef } from '@dvt/contracts';
import {
  MockAdapter,
  IdempotencyKeyBuilder,
  IntentReconcilerWorker,
  type IntentReconcilerWorkerOptions,
  type IntentReconcilerWorkerLogger,
  type IntentReconcilerWorkerMetrics,
  RunMaintenanceService,
  SnapshotProjector,
  type IClock,
  type IProviderAdapter,
} from '@dvt/engine';
import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import { getPgPool } from '../db/pool.js';
import type { Env } from '../plugins/env.js';

interface RuntimeHandle {
  start(): void;
  stop(): Promise<void>;
}

interface RuntimeStores {
  stateStore: PostgresStateStoreAdapter;
  intentStore: PostgresStartRunIntentStore;
}

interface ReconcilerRuntimeConfig {
  databaseUrl: string;
  schema: string;
  statementTimeoutMs: number;
  queryTimeoutMs: number;
  providers: readonly EngineRunRef['provider'][];
  workerOptions: IntentReconcilerWorkerOptions;
}

const SYSTEM_CLOCK: Pick<IClock, 'nowIsoUtc'> = {
  nowIsoUtc: () => new Date().toISOString(),
};

function resolveRuntimeConfig(env: Env, logger: FastifyBaseLogger): ReconcilerRuntimeConfig | null {
  if (!env.DVT_INTENT_RECONCILER_ENABLED) {
    logger.info({ enabled: false }, 'intent reconciler disabled');
    return null;
  }
  if (!env.DATABASE_URL) {
    logger.warn('intent reconciler disabled: DATABASE_URL not set');
    return null;
  }

  return {
    databaseUrl: env.DATABASE_URL,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
    providers: parseProviderList(env.DVT_INTENT_RECONCILER_PROVIDERS),
    workerOptions: {
      intervalMs: env.DVT_INTENT_RECONCILER_INTERVAL_MS,
      orphanThresholdMs: env.DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS,
      limit: env.DVT_INTENT_RECONCILER_LIMIT,
      errorBackoffMsBase: env.DVT_INTENT_RECONCILER_BACKOFF_BASE_MS,
      errorBackoffMsMax: env.DVT_INTENT_RECONCILER_BACKOFF_MAX_MS,
      tickTimeoutMs: env.DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS,
    },
  };
}

function parseProviderList(value: string): readonly EngineRunRef['provider'][] {
  return value
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0)
    .map((provider) => {
      if (provider === 'mock') return 'mock';
      throw new Error(`UNSUPPORTED_RECONCILER_PROVIDER: ${provider}`);
    });
}

function createRuntimeStores(config: ReconcilerRuntimeConfig): RuntimeStores {
  const pool = getPgPool(config.databaseUrl);
  const stateStore = new PostgresStateStoreAdapter({
    pool,
    schema: config.schema,
    statementTimeoutMs: config.statementTimeoutMs,
    queryTimeoutMs: config.queryTimeoutMs,
  });
  const intentStore = new PostgresStartRunIntentStore({
    pool,
    schema: config.schema,
    statementTimeoutMs: config.statementTimeoutMs,
    queryTimeoutMs: config.queryTimeoutMs,
  });
  return { stateStore, intentStore };
}

function resolveReconcilerAdapters(
  providers: readonly EngineRunRef['provider'][],
  stateStore: PostgresStateStoreAdapter
): Map<EngineRunRef['provider'], IProviderAdapter> {
  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>();
  for (const provider of providers) {
    if (provider === 'mock') {
      adapters.set(
        'mock',
        new MockAdapter({
          stateStore,
          projector: new SnapshotProjector(),
        })
      );
    }
  }
  return adapters;
}

function createMaintenanceService(
  stateStore: PostgresStateStoreAdapter,
  intentStore: PostgresStartRunIntentStore,
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>,
  observability: IObservability
): RunMaintenanceService {
  return new RunMaintenanceService({
    stateStore,
    intentStore,
    adapters,
    // reconcileOrphanedIntents does not perform tenant-gated operations.
    // This no-op authorizer is intentionally scoped to background reconciliation.
    authorizer: { assertTenantAccess: async () => {} },
    clock: SYSTEM_CLOCK as IClock,
    idempotency: new IdempotencyKeyBuilder(),
    observability,
  });
}

function createWorker(
  maintenance: RunMaintenanceService,
  logger: FastifyBaseLogger,
  observability: IObservability,
  options: IntentReconcilerWorkerOptions
): IntentReconcilerWorker {
  return new IntentReconcilerWorker(
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
    options
  );
}

function createRuntimeHandle(
  worker: IntentReconcilerWorker,
  stores: RuntimeStores,
  logger: FastifyBaseLogger
): RuntimeHandle {
  return {
    start: () => {
      worker.start();
      logger.info({ enabled: true }, 'intent reconciler started');
    },
    stop: async () => {
      await worker.stop();
      await Promise.all([stores.stateStore.close(), stores.intentStore.close()]);
      logger.info({ enabled: false }, 'intent reconciler stopped');
    },
  };
}

export async function createIntentReconcilerRuntime(
  env: Env,
  logger: FastifyBaseLogger,
  observability: IObservability
): Promise<RuntimeHandle | null> {
  const config = resolveRuntimeConfig(env, logger);
  if (config === null) return null;

  const stores = createRuntimeStores(config);
  const { stateStore, intentStore } = stores;
  await Promise.all([stateStore.migrate(), intentStore.migrate()]);
  const adapters = resolveReconcilerAdapters(config.providers, stateStore);
  if (adapters.size === 0) {
    throw new Error('INTENT_RECONCILER_NO_PROVIDER_ADAPTERS');
  }

  const maintenance = createMaintenanceService(stateStore, intentStore, adapters, observability);
  const worker = createWorker(maintenance, logger, observability, config.workerOptions);
  return createRuntimeHandle(worker, stores, logger);
}
