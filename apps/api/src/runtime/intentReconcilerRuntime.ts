import { PostgresStartRunIntentStore, PostgresStateStoreAdapter } from '@dvt/adapter-postgres';
import type { EngineRunRef } from '@dvt/contracts';
import {
  IdempotencyKeyBuilder,
  IntentReconcilerWorker,
  type IntentReconcilerWorkerOptions,
  type IntentReconcilerWorkerLogger,
  type IntentReconcilerWorkerMetrics,
  RunMaintenanceService,
  SnapshotProjector,
  type IClock,
  type IProviderAdapter,
  type IRunStateStoreRead,
  type IRunStateStoreWrite,
} from '@dvt/engine';
import { MockAdapter } from '@dvt/engine/testing';
import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import { getPgPool } from '../db/pool.js';
import { bindStateStoreRoles, type StateStoreRoleBindings } from '../modules/stateStoreRoles.js';
import type { Env } from '../plugins/env.js';

export interface IntentReconcilerRuntimeHandle {
  start(): void;
  stop(): Promise<void>;
}

export interface ReconcilerRuntimeHealthHooks {
  onSweepSuccess?: () => void;
  onSweepFailure?: () => void;
}

interface RuntimeStores {
  stateStore: PostgresStateStoreAdapter;
  stateStoreRoles: StateStoreRoleBindings;
  intentStore: PostgresStartRunIntentStore;
}

interface ReconcilerRuntimeConfig {
  databaseUrl: string;
  schema: string;
  statementTimeoutMs: number;
  queryTimeoutMs: number;
  outboxShardCount: number;
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
    outboxShardCount: env.DVT_OUTBOX_SHARD_COUNT,
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
  const pool = getPgPool({
    connectionString: config.databaseUrl,
    statementTimeoutMs: config.statementTimeoutMs,
    queryTimeoutMs: config.queryTimeoutMs,
  });
  const stateStore = new PostgresStateStoreAdapter({
    pool,
    schema: config.schema,
    statementTimeoutMs: config.statementTimeoutMs,
    queryTimeoutMs: config.queryTimeoutMs,
    outboxShardCount: config.outboxShardCount,
  });
  const stateStoreRoles = bindStateStoreRoles(stateStore);
  const intentStore = new PostgresStartRunIntentStore({
    pool,
    schema: config.schema,
    statementTimeoutMs: config.statementTimeoutMs,
    queryTimeoutMs: config.queryTimeoutMs,
  });
  return { stateStore, stateStoreRoles, intentStore };
}

function resolveReconcilerAdapters(
  providers: readonly EngineRunRef['provider'][],
  stateStoreRead: IRunStateStoreRead,
  stateStoreWrite: IRunStateStoreWrite
): Map<EngineRunRef['provider'], IProviderAdapter> {
  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>();
  for (const provider of providers) {
    if (provider === 'mock') {
      adapters.set(
        'mock',
        new MockAdapter({
          stateStore: stateStoreRead,
          stateStoreWrite,
          clock: SYSTEM_CLOCK,
          projector: new SnapshotProjector(),
        })
      );
    }
  }
  return adapters;
}

function createMaintenanceService(
  stateStoreRead: IRunStateStoreRead,
  stateStoreWrite: IRunStateStoreWrite,
  intentStore: PostgresStartRunIntentStore,
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>,
  observability: IObservability
): RunMaintenanceService {
  return new RunMaintenanceService({
    stateStoreRead,
    stateStoreWrite,
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

function createWorker(input: {
  maintenance: RunMaintenanceService;
  logger: FastifyBaseLogger;
  observability: IObservability;
  options: IntentReconcilerWorkerOptions;
  healthHooks: ReconcilerRuntimeHealthHooks;
}): IntentReconcilerWorker {
  const { maintenance, logger, observability, options, healthHooks } = input;

  return new IntentReconcilerWorker(
    maintenance,
    {
      info: (data) => {
        healthHooks.onSweepSuccess?.();
        logger.info(data, 'intent reconciler sweep');
      },
      error: (data) => {
        healthHooks.onSweepFailure?.();
        logger.error(data, 'intent reconciler sweep failed');
      },
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
    options,
    { clock: SYSTEM_CLOCK }
  );
}

function createRuntimeHandle(
  worker: IntentReconcilerWorker,
  stores: RuntimeStores,
  logger: FastifyBaseLogger
): IntentReconcilerRuntimeHandle {
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
  observability: IObservability,
  healthHooks: ReconcilerRuntimeHealthHooks = {}
): Promise<IntentReconcilerRuntimeHandle | null> {
  const config = resolveRuntimeConfig(env, logger);
  if (config === null) return null;

  const stores = createRuntimeStores(config);
  const { stateStore, stateStoreRoles, intentStore } = stores;
  await Promise.all([stateStore.migrate(), intentStore.migrate()]);
  const adapters = resolveReconcilerAdapters(
    config.providers,
    stateStoreRoles.read,
    stateStoreRoles.write
  );
  if (adapters.size === 0) {
    throw new Error('INTENT_RECONCILER_NO_PROVIDER_ADAPTERS');
  }

  const maintenance = createMaintenanceService(
    stateStoreRoles.read,
    stateStoreRoles.write,
    intentStore,
    adapters,
    observability
  );
  const worker = createWorker({
    maintenance,
    logger,
    observability,
    options: config.workerOptions,
    healthHooks,
  });
  return createRuntimeHandle(worker, stores, logger);
}
