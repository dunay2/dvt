/**
 * @ownedConcern Own concrete API-side intent reconciler assembly behind the runtime facade.
 * @baseline ADR-0039: Hexagonal Port Hardening and SOLID Remediation
 * @decision Keep Postgres, provider adapter, maintenance, worker, and handle assembly in apps/api.
 * @consequence Public runtime callers depend on a stable facade while concrete wiring stays root-owned.
 * @version 1.0.0
 */
import {
  migratePostgresRuntimeStores,
  PostgresStartRunIntentStore,
  PostgresStateStoreAdapter,
} from '@dvt/adapter-postgres';
import { asIsoUtcString, type EngineRunRef } from '@dvt/contracts';
import type { IClock, IProviderAdapter } from '@dvt/engine';
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

import type {
  IntentReconcilerRuntimeHandle,
  ReconcilerRuntimeHealthHooks,
} from './intentReconcilerRuntime.js';

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

export interface IntentReconcilerRuntimeCompositionHandle {
  create(): Promise<IntentReconcilerRuntimeHandle | null>;
}

const SYSTEM_CLOCK: Pick<IClock, 'nowIsoUtc'> = {
  nowIsoUtc: () => asIsoUtcString(new Date().toISOString()),
};

class IntentReconcilerRuntimeComposition implements IntentReconcilerRuntimeCompositionHandle {
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
    if (!this.env.DVT_INTENT_RECONCILER_ENABLED) {
      this.logger.info({ enabled: false }, 'intent reconciler disabled');
      return null;
    }
    if (!this.env.DATABASE_URL) {
      this.logger.warn('intent reconciler disabled: DATABASE_URL not set');
      return null;
    }

    return {
      databaseUrl: this.env.DATABASE_URL,
      schema: this.env.DVT_PG_SCHEMA,
      statementTimeoutMs: this.env.DVT_PG_STATEMENT_TIMEOUT_MS,
      queryTimeoutMs: this.env.DVT_PG_QUERY_TIMEOUT_MS,
      outboxShardCount: this.env.DVT_OUTBOX_SHARD_COUNT,
      providers: this.parseProviderList(this.env.DVT_INTENT_RECONCILER_PROVIDERS),
      workerOptions: {
        intervalMs: this.env.DVT_INTENT_RECONCILER_INTERVAL_MS,
        orphanThresholdMs: this.env.DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS,
        limit: this.env.DVT_INTENT_RECONCILER_LIMIT,
        errorBackoffMsBase: this.env.DVT_INTENT_RECONCILER_BACKOFF_BASE_MS,
        errorBackoffMsMax: this.env.DVT_INTENT_RECONCILER_BACKOFF_MAX_MS,
        tickTimeoutMs: this.env.DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS,
      },
    };
  }

  private parseProviderList(value: string): readonly EngineRunRef['provider'][] {
    return value
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter((p) => p.length > 0)
      .map((provider) => {
        if (provider === 'temporal') return 'temporal';
        throw new Error(`UNSUPPORTED_RECONCILER_PROVIDER: ${provider}`);
      });
  }

  private createStores(config: ReconcilerRuntimeConfig): RuntimeStores {
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
    const factories = [createTemporalProviderAdapterFactory()].filter((factory) =>
      config.providers.includes(factory.provider)
    );
    const { adapters } = await buildProviderAdapters(
      this.env,
      {
        stateStore: stores.stateStoreRoles.read,
        stateStoreWrite: stores.stateStoreRoles.write,
        clock: SYSTEM_CLOCK,
        projector: new SnapshotProjector(),
        observability: this.observability,
      },
      factories
    );
    return adapters;
  }

  private createMaintenance(
    stores: RuntimeStores,
    adapters: Map<EngineRunRef['provider'], IProviderAdapter>
  ): RunMaintenanceService {
    return new RunMaintenanceService({
      stateStoreRead: stores.stateStoreRoles.read,
      stateStoreWrite: stores.stateStoreRoles.write,
      intentStore: stores.intentStore,
      adapters,
      // reconcileOrphanedIntents does not perform tenant-gated operations.
      // This no-op authorizer is intentionally scoped to background reconciliation.
      authorizer: { assertTenantAccess: async () => {} },
      clock: SYSTEM_CLOCK as IClock,
      idempotency: new IdempotencyKeyBuilder(),
      observability: this.observability,
    });
  }

  private createWorker(
    maintenance: RunMaintenanceService,
    config: ReconcilerRuntimeConfig
  ): IntentReconcilerWorker {
    return new IntentReconcilerWorker(
      maintenance,
      {
        info: (data) => {
          this.healthHooks.onSweepSuccess?.();
          this.logger.info(data, 'intent reconciler sweep');
        },
        error: (data) => {
          this.healthHooks.onSweepFailure?.();
          this.logger.error(data, 'intent reconciler sweep failed');
        },
      } satisfies IntentReconcilerWorkerLogger,
      {
        increment: (name, value = 1) => {
          this.observability.metrics.counter(name).add(value);
        },
        timing: (name, valueMs) => {
          this.observability.metrics.histogram(name).record(valueMs);
        },
        gauge: (name, value) => {
          this.observability.metrics.gauge(name).set(value);
        },
      } satisfies IntentReconcilerWorkerMetrics,
      config.workerOptions,
      { clock: SYSTEM_CLOCK }
    );
  }

  private createHandle(
    worker: IntentReconcilerWorker,
    stores: RuntimeStores
  ): IntentReconcilerRuntimeHandle {
    return {
      start: () => {
        worker.start();
        this.logger.info({ enabled: true }, 'intent reconciler started');
      },
      stop: async () => {
        await worker.stop();
        await Promise.all([stores.stateStore.close(), stores.intentStore.close()]);
        this.logger.info({ enabled: false }, 'intent reconciler stopped');
      },
    };
  }
}

export function createIntentReconcilerRuntimeComposition(
  env: Env,
  logger: FastifyBaseLogger,
  observability: IObservability,
  healthHooks: ReconcilerRuntimeHealthHooks
): IntentReconcilerRuntimeCompositionHandle {
  return new IntentReconcilerRuntimeComposition(env, logger, observability, healthHooks);
}
