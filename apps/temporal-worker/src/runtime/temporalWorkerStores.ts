/**
 * @ownedConcern Build state, plan, and activity dependencies for the Temporal worker runtime.
 */
import {
  PostgresPlanStore,
  PostgresRunStateCommandPortBridge,
  PostgresStateStoreAdapter,
} from '@dvt/adapter-postgres';
import { CircuitBreakingRunStateCommandPort, type ActivityDeps } from '@dvt/adapter-temporal';
import { asIsoUtcString } from '@dvt/contracts';
import { IdempotencyKeyBuilder, PlanIntegrityValidator } from '@dvt/engine';

import type { Env } from '../plugins/env.js';

import type {
  CreateTemporalWorkerRuntimeOptions,
  PlanFetcherLike,
  StateStoreLike,
} from './runtimeTypes.js';

export interface TemporalWorkerStores {
  stateStore: StateStoreLike;
  planStore: PlanFetcherLike;
}

export interface TemporalWorkerActivityDeps {
  activityDeps: ActivityDeps;
  runStateCircuit: CircuitBreakingRunStateCommandPort;
}

export function createTemporalWorkerStores(
  env: Env,
  options: CreateTemporalWorkerRuntimeOptions,
  runMigrations: boolean
): TemporalWorkerStores {
  const stateStore =
    options.stateStoreFactory?.(env) ??
    new PostgresStateStoreAdapter({
      connectionString: env.DATABASE_URL,
      schema: env.DVT_PG_SCHEMA,
      statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
      queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
      assumeSchemaReady: !runMigrations,
    });
  const planStore =
    options.planFetcherFactory?.(env) ??
    new PostgresPlanStore({
      connectionString: env.DATABASE_URL,
      schema: env.DVT_PG_SCHEMA,
      statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
      queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
      assumeSchemaReady: !runMigrations,
      toExecutablePlan: (buildResult) => ({
        schemaVersion: buildResult.plan.metadata.schemaVersion,
        text: JSON.stringify(buildResult.plan),
      }),
    });

  return {
    stateStore,
    planStore,
  };
}

export function createTemporalWorkerActivityDeps(
  env: Env,
  stateStore: StateStoreLike,
  planStore: PlanFetcherLike
): TemporalWorkerActivityDeps {
  const runStateCircuit = new CircuitBreakingRunStateCommandPort({
    delegate: new PostgresRunStateCommandPortBridge(stateStore as never),
    failureThreshold: env.DVT_RUNSTATE_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    openDurationMs: env.DVT_RUNSTATE_CIRCUIT_BREAKER_OPEN_DURATION_MS,
    operationTimeoutMs: env.DVT_RUNSTATE_CIRCUIT_BREAKER_OPERATION_TIMEOUT_MS,
  });
  const activityDeps: ActivityDeps = {
    runStateCommandPort: runStateCircuit,
    clock: { nowIsoUtc: () => asIsoUtcString(new Date().toISOString()) },
    idempotency: new IdempotencyKeyBuilder(),
    fetcher: planStore,
    integrity: new PlanIntegrityValidator(),
  };

  return {
    activityDeps,
    runStateCircuit,
  };
}
