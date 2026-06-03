/**
 * Owned concern: assemble the protected start-run admission and duplicate-check
 * runtime for `apps/api`.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { asIsoUtcString } from '@dvt/contracts';
import { StartRunAdmissionGuard } from '@dvt/delivery';
import type { IObservability } from '@dvt/observability';

import { ObservabilityBackpressureCapacityTelemetry } from '../../infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.js';
import { CachedBackpressureStore } from '../../infrastructure/backpressure/CachedBackpressureStore.js';
import { CircuitBreakingBackpressureStore } from '../../infrastructure/backpressure/CircuitBreakingBackpressureStore.js';
import { FileBackpressureFallbackStore } from '../../infrastructure/backpressure/FileBackpressureFallbackStore.js';
import { MetricsEmittingBackpressureStore } from '../../infrastructure/backpressure/MetricsEmittingBackpressureStore.js';
import { RawSqlBackpressureStore } from '../../infrastructure/backpressure/RawSqlBackpressureStore.js';
import { PostgresDuplicateRunProbe } from '../../infrastructure/startRun/PostgresDuplicateRunProbe.js';
import type { Env } from '../../plugins/env.js';

import type { RuntimePool } from './shared.js';

export type BuildProtectedAdmissionRuntimeDeps = {
  readonly PostgresBackpressureSnapshotReader: typeof import('@dvt/adapter-postgres').PostgresBackpressureSnapshotReader;
  readonly env: Env;
  readonly observability: IObservability;
  readonly pool: RuntimePool;
};

export function buildProtectedAdmissionRuntime(deps: BuildProtectedAdmissionRuntimeDeps) {
  const duplicateProbe = new PostgresDuplicateRunProbe({
    pool: deps.pool,
    schema: deps.env.DVT_PG_SCHEMA,
    queryTimeoutMs: deps.env.DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS,
  });
  const backpressureReader = new deps.PostgresBackpressureSnapshotReader({
    pool: deps.pool,
    schema: deps.env.DVT_PG_SCHEMA,
    now: () => asIsoUtcString(new Date().toISOString()),
    queryTimeoutMs: deps.env.DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS,
    stuckEventAgeThresholdMs: deps.env.DVT_START_RUN_STUCK_EVENT_AGE_THRESHOLD_MS,
    localOverloadPendingThreshold: deps.env.DVT_START_RUN_MAX_PENDING_EVENTS_PER_TENANT,
  });
  const rawBackpressureStore = new RawSqlBackpressureStore(backpressureReader);
  const resilientBackpressureStore = new CircuitBreakingBackpressureStore({
    delegate: rawBackpressureStore,
    fallbackStore: new FileBackpressureFallbackStore(resolveBackpressureFallbackPath(deps.env)),
    failureThreshold: 5,
    openDurationMs: 30_000,
    snapshotMaxAgeMs:
      deps.env.DVT_START_RUN_BACKPRESSURE_CACHE_TTL_MS +
      deps.env.DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS,
  });
  const backpressureStore = new CachedBackpressureStore({
    delegate: resilientBackpressureStore,
    ttlMs: deps.env.DVT_START_RUN_BACKPRESSURE_CACHE_TTL_MS,
  });
  const capacityTelemetry = new ObservabilityBackpressureCapacityTelemetry({
    observability: deps.observability,
  });
  const instrumentedBackpressureStore = new MetricsEmittingBackpressureStore({
    delegate: backpressureStore,
    capacityTelemetry,
  });
  const admissionGuard = new StartRunAdmissionGuard({
    backpressureStore: instrumentedBackpressureStore,
    policy: {
      maxPendingEventsPerTenant: deps.env.DVT_START_RUN_MAX_PENDING_EVENTS_PER_TENANT,
      maxOutboxLagMs: deps.env.DVT_START_RUN_MAX_OUTBOX_LAG_MS,
    },
  });

  return {
    duplicateProbe,
    admissionGuard,
  };
}

function resolveBackpressureFallbackPath(env: Env): string {
  return join(tmpdir(), 'dvt', `${env.SERVICE_NAME}-start-run-backpressure-fallback.json`);
}
