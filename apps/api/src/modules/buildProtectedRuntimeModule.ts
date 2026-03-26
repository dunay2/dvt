import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { StartRunAdmissionGuard } from '@dvt/delivery';
import type { IObservability } from '@dvt/observability';
import { PlannerFacade } from '@dvt/planner';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import { BackpressureAwareStartRunUseCase } from '../application/services/BackpressureAwareStartRunUseCase.js';
import { EngineStartRunUseCase } from '../application/services/engineStartRunUseCase.js';
import { PlannerBackedStartRunUseCase } from '../application/services/PlannerBackedStartRunUseCase.js';
import { bridgePlannerBuildToExecutablePlan } from '../application/services/plannerExecutionPlanBridge.js';
import { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';
import { StoredExecutablePlanResolver } from '../application/services/StoredExecutablePlanResolver.js';
import { StoredPlanExecutabilityValidator } from '../application/services/StoredPlanExecutabilityValidator.js';
import { buildWorkflowEngine } from '../application/services/WorkflowEngineFactory.js';
import { getPgPool } from '../db/pool.js';
import { TenantHierarchyAuthorizationPolicy } from '../domain/auth/policy.js';
import { ObservabilityAdmissionTelemetry } from '../infrastructure/admissionTelemetry/ObservabilityAdmissionTelemetry.js';
import { ObservabilityBackpressureCapacityTelemetry } from '../infrastructure/admissionTelemetry/ObservabilityBackpressureCapacityTelemetry.js';
import { StructuredAuditLogger } from '../infrastructure/audit/structuredAuditLogger.js';
import { JwksJwtVerifier } from '../infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from '../infrastructure/auth/oidcAuthenticator.js';
import { PostgresPrincipalAccessRepository } from '../infrastructure/auth/postgresPrincipalAccessRepository.js';
import { CachedBackpressureStore } from '../infrastructure/backpressure/CachedBackpressureStore.js';
import { CircuitBreakingBackpressureStore } from '../infrastructure/backpressure/CircuitBreakingBackpressureStore.js';
import { FileBackpressureFallbackStore } from '../infrastructure/backpressure/FileBackpressureFallbackStore.js';
import { MetricsEmittingBackpressureStore } from '../infrastructure/backpressure/MetricsEmittingBackpressureStore.js';
import { RawSqlBackpressureStore } from '../infrastructure/backpressure/RawSqlBackpressureStore.js';
import { PostgresDuplicateRunProbe } from '../infrastructure/startRun/PostgresDuplicateRunProbe.js';
import type { Env } from '../plugins/env.js';

import { buildProviderAdapters } from './buildProviderAdapters.js';
import { bindStateStoreRoles } from './stateStoreRoles.js';
import type { ProtectedRuntimeModule } from './types.js';

function requireDatabaseUrl(env: Env): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when OIDC-protected runtime routes are enabled');
  }
  return env.DATABASE_URL;
}

function resolveBackpressureFallbackPath(env: Env): string {
  return join(tmpdir(), 'dvt', `${env.SERVICE_NAME}-start-run-backpressure-fallback.json`);
}

export async function buildProtectedRuntimeModule(
  app: FastifyInstance,
  env: Env,
  observability: IObservability
): Promise<ProtectedRuntimeModule> {
  const databaseUrl = requireDatabaseUrl(env);
  const pool = getPgPool(databaseUrl);

  const [adapterMod, engineMod] = await Promise.all([
    import('@dvt/adapter-postgres'),
    import('@dvt/engine'),
  ]);
  const {
    PostgresBackpressureSnapshotReader,
    PostgresPlanStore,
    PostgresStateStoreAdapter,
    PostgresStartRunIntentStore,
  } = adapterMod;
  const { AllowAllAuthorizer, SnapshotProjector } = engineMod;

  const stateStore = new PostgresStateStoreAdapter({
    connectionString: databaseUrl,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const stateStoreRoles = bindStateStoreRoles(stateStore);

  const intentStore = new PostgresStartRunIntentStore({
    connectionString: databaseUrl,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const planStore = new PostgresPlanStore({
    pool,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
    toExecutablePlan: (buildResult) => {
      const plan = bridgePlannerBuildToExecutablePlan(buildResult);
      return {
        schemaVersion: plan.metadata.schemaVersion,
        text: JSON.stringify(plan),
        ...(plan.metadata.requiresCapabilities === undefined
          ? {}
          : { requiresCapabilities: plan.metadata.requiresCapabilities }),
      };
    },
  });
  const projector = new SnapshotProjector();

  const duplicateProbe = new PostgresDuplicateRunProbe({
    pool,
    schema: env.DVT_PG_SCHEMA,
    queryTimeoutMs: env.DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS,
  });
  const backpressureReader = new PostgresBackpressureSnapshotReader({
    pool,
    schema: env.DVT_PG_SCHEMA,
    now: () => new Date().toISOString(),
    queryTimeoutMs: env.DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS,
    stuckEventAgeThresholdMs: env.DVT_START_RUN_STUCK_EVENT_AGE_THRESHOLD_MS,
    localOverloadPendingThreshold: env.DVT_START_RUN_MAX_PENDING_EVENTS_PER_TENANT,
  });
  const rawBackpressureStore = new RawSqlBackpressureStore(backpressureReader);
  const resilientBackpressureStore = new CircuitBreakingBackpressureStore({
    delegate: rawBackpressureStore,
    fallbackStore: new FileBackpressureFallbackStore(resolveBackpressureFallbackPath(env)),
    failureThreshold: 5,
    openDurationMs: 30_000,
    snapshotMaxAgeMs:
      env.DVT_START_RUN_BACKPRESSURE_CACHE_TTL_MS + env.DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS,
  });
  const cachedBackpressureStore = new CachedBackpressureStore({
    delegate: resilientBackpressureStore,
    ttlMs: env.DVT_START_RUN_BACKPRESSURE_CACHE_TTL_MS,
  });
  const capacityTelemetry = new ObservabilityBackpressureCapacityTelemetry({
    observability,
  });
  const instrumentedBackpressureStore = new MetricsEmittingBackpressureStore({
    delegate: backpressureStore,
    capacityTelemetry,
  });
  const admissionGuard = new StartRunAdmissionGuard({
    backpressureStore: instrumentedBackpressureStore,
    policy: {
      maxPendingEventsPerTenant: env.DVT_START_RUN_MAX_PENDING_EVENTS_PER_TENANT,
      maxOutboxLagMs: env.DVT_START_RUN_MAX_OUTBOX_LAG_MS,
    },
  });
  const executablePlanResolver = new StoredExecutablePlanResolver({
    fetcher: planStore,
  });

  const { adapters, close: closeAdapters } = await buildProviderAdapters(env, {
    stateStore: stateStoreRoles.read,
    projector,
    observability,
    planFetcher: executablePlanResolver,
  });

  if (env.TEMPORAL_ADDRESS) {
    app.log.info(`Temporal adapter registered (address=${env.TEMPORAL_ADDRESS})`);
  }

  const engine = buildWorkflowEngine({
    security: {
      authorizer: new AllowAllAuthorizer(),
      planRefAllowedSchemes: ['https', 's3', 'gs', 'azure', 'dvt-plan'],
    },
    persistence: {
      stateStoreRead: stateStoreRoles.read,
      stateStoreWrite: stateStoreRoles.write,
      intentStore,
    },
    runtime: { adapters },
    infrastructure: {
      clock: { nowIsoUtc: () => new Date().toISOString() },
      observability,
    },
  });

  const accessRepo = new PostgresPrincipalAccessRepository(pool, env.DVT_PG_SCHEMA);
  const auditLogger = new StructuredAuditLogger(app.log as unknown as Logger);
  const policy = new TenantHierarchyAuthorizationPolicy();
  const commandAuthorizer = new AuthorizeCommandScopeService(
    accessRepo,
    policy,
    auditLogger,
    () => new Date()
  );
  const authenticator = new OidcAuthenticator(
    new JwksJwtVerifier({
      jwksUri: env.OIDC_JWKS_URI!,
      issuer: env.OIDC_ISSUER!,
      audience: env.OIDC_AUDIENCE!,
      algorithms: env.OIDC_ALGORITHMS.split(',').map((a) => a.trim()),
    })
  );
  const facade = new StartRunAuthorizedFacade(
    authenticator,
    commandAuthorizer,
    new BackpressureAwareStartRunUseCase({
      duplicateProbe,
      admissionGuard,
      telemetry: new ObservabilityAdmissionTelemetry({ observability }),
      mode: env.DVT_START_RUN_BACKPRESSURE_MODE,
      retryAfterSeconds: env.DVT_START_RUN_RETRY_AFTER_SECONDS,
      delegate: new PlannerBackedStartRunUseCase({
        planner: new PlannerFacade(),
        planStore,
        validator: new StoredPlanExecutabilityValidator({
          fetcher: planStore,
          adapters,
        }),
        delegate: new EngineStartRunUseCase(engine),
      }),
    })
  );

  return {
    facade,
    authenticator,
    authorizer: commandAuthorizer,
    engine,
    adapters,
    stateStore: stateStoreRoles,
    migrate: async () => {
      await accessRepo.migrate();
      await stateStore.migrate();
      await intentStore.migrate();
      await planStore.migrate();
    },
    close: async () => {
      await closeAdapters();
      await planStore.close();
      await stateStore.close();
      await intentStore.close();
      await pool.end();
    },
  };
}
