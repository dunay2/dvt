/**
 * @ownedConcern Own API-side intent reconciler runtime composition; not an engine domain service.
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Keep Postgres, provider adapter, maintenance, worker, and handle assembly in apps/api.
 * @consequence @dvt/engine receives runtime ports and services without reading API environment.
 * @version 1.0.0
 */
import {
  migratePostgresRuntimeStores,
  PostgresStartRunIntentStore,
  PostgresStateStoreAdapter,
} from '@dvt/adapter-postgres';
import { asIsoUtcString, type EngineRunRef } from '@dvt/contracts';
import type {
  IClock,
  IProviderAdapter,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '@dvt/engine';
import {
  IdempotencyKeyBuilder,
  IntentReconcilerWorker,
  RunMaintenanceService,
  SnapshotProjector,
  type IntentReconcilerWorkerLogger,
  type IntentReconcilerWorkerMetrics,
  type IntentReconcilerWorkerOptions,
} from '@dvt/engine/runtime';
import type { IObservability } from '@dvt/observability';
import type { FastifyBaseLogger } from 'fastify';

import { getPgPool } from '../db/pool.js';
import { buildProviderAdapters } from '../modules/buildProviderAdapters.js';
import { createTemporalProviderAdapterFactory } from '../modules/providerAdapters/createTemporalProviderAdapterFactory.js';
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
  nowIsoUtc: () => asIsoUtcString(new Date().toISOString()),
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
      if (provider === 'temporal') return 'temporal';
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

async function resolveReconcilerAdapters(
  env: Env,
  providers: readonly EngineRunRef['provider'][],
  stateStoreRead: IRunStateStoreRead,
  stateStoreWrite: IRunStateStoreWrite,
  observability: IObservability
): Promise<Map<EngineRunRef['provider'], IProviderAdapter>> {
  const factories = [createTemporalProviderAdapterFactory()].filter((factory) =>
    providers.includes(factory.provider)
  );
  const { adapters } = await buildProviderAdapters(
    env,
    {
      stateStore: stateStoreRead,
      stateStoreWrite,
      clock: SYSTEM_CLOCK,
      projector: new SnapshotProjector(),
      observability,
    },
    factories
  );
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

class IntentReconcilerRuntimeComposition {
  constructor(
    private readonly env: Env,
    private readonly logger: FastifyBaseLogger,
    private readonly observability: IObservability,
    private readonly healthHooks: ReconcilerRuntimeHealthHooks
  ) {}

  async create(): Promise<IntentReconcilerRuntimeHandle | null> {
    const config = this.resolveConfig();
    if (config === null) return null;

    const stores = this.createStores(config);
    await this.migrateStores(stores);
    const adapters = await this.resolveAdapters(config, stores);
    if (adapters.size === 0) {
      throw new Error('INTENT_RECONCILER_NO_PROVIDER_ADAPTERS');
    }

    const maintenance = this.createMaintenance(stores, adapters);
    const worker = this.createWorker(maintenance, config);
    return this.createHandle(worker, stores);
  }

  private resolveConfig(): ReconcilerRuntimeConfig | null {
    return resolveRuntimeConfig(this.env, this.logger);
  }

  private createStores(config: ReconcilerRuntimeConfig): RuntimeStores {
    return createRuntimeStores(config);
  }

  private async migrateStores(stores: RuntimeStores): Promise<void> {
    await migratePostgresRuntimeStores({
      stateStore: stores.stateStore,
      startRunIntentStore: stores.intentStore,
    });
  }

  private async resolveAdapters(
    config: ReconcilerRuntimeConfig,
    stores: RuntimeStores
  ): Promise<Map<EngineRunRef['provider'], IProviderAdapter>> {
    return resolveReconcilerAdapters(
      this.env,
      config.providers,
      stores.stateStoreRoles.read,
      stores.stateStoreRoles.write,
      this.observability
    );
  }

  private createMaintenance(
    stores: RuntimeStores,
    adapters: Map<EngineRunRef['provider'], IProviderAdapter>
  ): RunMaintenanceService {
    return createMaintenanceService(
      stores.stateStoreRoles.read,
      stores.stateStoreRoles.write,
      stores.intentStore,
      adapters,
      this.observability
    );
  }

  private createWorker(
    maintenance: RunMaintenanceService,
    config: ReconcilerRuntimeConfig
  ): IntentReconcilerWorker {
    return createWorker({
      maintenance,
      logger: this.logger,
      observability: this.observability,
      options: config.workerOptions,
      healthHooks: this.healthHooks,
    });
  }

  private createHandle(
    worker: IntentReconcilerWorker,
    stores: RuntimeStores
  ): IntentReconcilerRuntimeHandle {
    return createRuntimeHandle(worker, stores, this.logger);
  }
}

function createIntentReconcilerRuntimeComposition(
  env: Env,
  logger: FastifyBaseLogger,
  observability: IObservability,
  healthHooks: ReconcilerRuntimeHealthHooks
): IntentReconcilerRuntimeComposition {
  return new IntentReconcilerRuntimeComposition(env, logger, observability, healthHooks);
}

export async function createIntentReconcilerRuntime(
  env: Env,
  logger: FastifyBaseLogger,
  observability: IObservability,
  healthHooks: ReconcilerRuntimeHealthHooks = {}
): Promise<IntentReconcilerRuntimeHandle | null> {
  return createIntentReconcilerRuntimeComposition(env, logger, observability, healthHooks).create();
}
