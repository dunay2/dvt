/**
 * Owned concern: assemble the protected runtime component for `apps/api`.
 * This module is the only composition root that binds planner, validator,
 * adapters, stores, auth, and runtime services into one `ProtectedRuntimeModule`.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { asIsoUtcString, createDefaultStepTypeRegistry } from '@dvt/contracts';
import { StartRunAdmissionGuard } from '@dvt/delivery';
import type { ExecutionPlan } from '@dvt/engine';
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import { AuthorizeWorkspaceGraphDraftCapabilityService } from '../application/services/authorizeWorkspaceGraphDraftCapabilityService.js';
import { GetWorkspaceGraphDraftUseCase } from '../application/services/getWorkspaceGraphDraftUseCase.js';
import { SaveWorkspaceGraphDraftUseCase } from '../application/services/saveWorkspaceGraphDraftUseCase.js';
import { createStartRunTargetAdapterRegistryFromValues } from '../application/services/startRunTargetAdapterRegistry.js';
import { StoredExecutablePlanResolver } from '../application/services/StoredExecutablePlanResolver.js';
import { buildWorkflowEngine } from '../application/services/WorkflowEngineFactory.js';
import { getPgPool } from '../db/pool.js';
import { TenantHierarchyAuthorizationPolicy } from '../domain/auth/policy.js';
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
import { ArtifactBackedRunExecutionContextResolver } from '../infrastructure/startRun/ArtifactBackedRunExecutionContextResolver.js';
import { ArtifactStoreDbtProjectBundleBindingPolicy } from '../infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.js';
import { PostgresDuplicateRunProbe } from '../infrastructure/startRun/PostgresDuplicateRunProbe.js';
import { PostgresWorkspaceGraphDraftStore } from '../infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import { StructuredWorkspaceGraphDraftAuditLogger } from '../infrastructure/workspaceGraphDraft/StructuredWorkspaceGraphDraftAuditLogger.js';
import type { Env } from '../plugins/env.js';

import { buildProviderAdapters } from './buildProviderAdapters.js';
import { buildProtectedStartRunRuntime } from './startRun/buildProtectedStartRunRuntime.js';
import { bindStateStoreRoles } from './stateStoreRoles.js';
import type { ProtectedRuntimeModule } from './types.js';

async function closeAllClosers(closers: Array<() => Promise<void>>): Promise<void> {
  const results = await Promise.allSettled(closers.map((closer) => closer()));
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []));
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to close protected runtime cleanly');
  }
}

function requireDatabaseUrl(env: Env): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when OIDC-protected runtime routes are enabled');
  }
  return env.DATABASE_URL;
}

function resolveBackpressureFallbackPath(env: Env): string {
  return join(tmpdir(), 'dvt', `${env.SERVICE_NAME}-start-run-backpressure-fallback.json`);
}

function resolveDbtBundleArtifactStore(env: Env) {
  if (env.DVT_DBT_BUNDLE_STORE_BACKEND === 's3') {
    return {
      kind: 's3' as const,
      bucket: env.DVT_DBT_BUNDLE_S3_BUCKET as string,
    };
  }

  if (env.DVT_DBT_BUNDLE_STORE_BACKEND === 'file') {
    return {
      kind: 'file' as const,
      rootPath: env.DVT_DBT_BUNDLE_FILE_ROOT as string,
    };
  }

  return undefined;
}

type RuntimePool = ReturnType<typeof getPgPool>;
type ProtectedRuntimeStorage = ReturnType<typeof buildProtectedRuntimeStorage>;

function buildProtectedRuntimeStorage(deps: {
  readonly PostgresPlanStore: typeof import('@dvt/adapter-postgres').PostgresPlanStore;
  readonly PostgresStateStoreAdapter: typeof import('@dvt/adapter-postgres').PostgresStateStoreAdapter;
  readonly PostgresStartRunIntentStore: typeof import('@dvt/adapter-postgres').PostgresStartRunIntentStore;
  readonly SnapshotProjector: typeof import('@dvt/engine').SnapshotProjector;
  readonly databaseUrl: string;
  readonly env: Env;
  readonly pool: RuntimePool;
}) {
  const stateStore = new deps.PostgresStateStoreAdapter({
    connectionString: deps.databaseUrl,
    schema: deps.env.DVT_PG_SCHEMA,
    statementTimeoutMs: deps.env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const stateStoreRoles = bindStateStoreRoles(stateStore);

  const intentStore = new deps.PostgresStartRunIntentStore({
    connectionString: deps.databaseUrl,
    schema: deps.env.DVT_PG_SCHEMA,
    statementTimeoutMs: deps.env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const planStore = new deps.PostgresPlanStore({
    pool: deps.pool,
    schema: deps.env.DVT_PG_SCHEMA,
    statementTimeoutMs: deps.env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
    toExecutablePlan: (buildResult) => {
      const plan: ExecutionPlan = buildResult.plan;
      return {
        schemaVersion: plan.metadata.schemaVersion,
        text: JSON.stringify(plan),
      };
    },
  });
  const projector = new deps.SnapshotProjector();
  const stepTypeRegistry = createDefaultStepTypeRegistry();
  const executablePlanResolver = new StoredExecutablePlanResolver({
    fetcher: planStore,
    stepTypeRegistry,
  });
  const systemClock = { nowIsoUtc: () => asIsoUtcString(new Date().toISOString()) };
  const runExecutionContextResolver = new ArtifactBackedRunExecutionContextResolver({
    nodeEnv: deps.env.NODE_ENV,
  });
  const runExecutionContextBindingPolicy = new ArtifactStoreDbtProjectBundleBindingPolicy({
    bundleStore: resolveDbtBundleArtifactStore(deps.env),
  });

  return {
    stateStore,
    stateStoreRoles,
    intentStore,
    planStore,
    projector,
    stepTypeRegistry,
    executablePlanResolver,
    systemClock,
    runExecutionContextResolver,
    runExecutionContextBindingPolicy,
  };
}

function buildProtectedAdmissionRuntime(deps: {
  readonly PostgresBackpressureSnapshotReader: typeof import('@dvt/adapter-postgres').PostgresBackpressureSnapshotReader;
  readonly env: Env;
  readonly observability: IObservability;
  readonly pool: RuntimePool;
}) {
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

function buildProtectedSecurityRuntime(deps: {
  readonly app: FastifyInstance;
  readonly env: Env;
  readonly pool: RuntimePool;
}) {
  const accessRepo = new PostgresPrincipalAccessRepository(deps.pool, deps.env.DVT_PG_SCHEMA);
  const auditLogger = new StructuredAuditLogger(deps.app.log as unknown as Logger);
  const policy = new TenantHierarchyAuthorizationPolicy();
  const commandAuthorizer = new AuthorizeCommandScopeService(
    accessRepo,
    policy,
    auditLogger,
    () => new Date()
  );
  const authenticator = new OidcAuthenticator(
    new JwksJwtVerifier({
      jwksUri: deps.env.OIDC_JWKS_URI!,
      issuer: deps.env.OIDC_ISSUER!,
      audience: deps.env.OIDC_AUDIENCE!,
      algorithms: deps.env.OIDC_ALGORITHMS.split(',').map((a) => a.trim()),
    })
  );

  return {
    accessRepo,
    commandAuthorizer,
    authenticator,
  };
}

function buildWorkspaceGraphDraftRuntime(deps: {
  readonly app: FastifyInstance;
  readonly authenticator: OidcAuthenticator;
  readonly commandAuthorizer: AuthorizeCommandScopeService;
  readonly env: Env;
  readonly pool: RuntimePool;
}) {
  const workspaceGraphDraftStore = new PostgresWorkspaceGraphDraftStore({
    pool: deps.pool,
    schema: deps.env.DVT_PG_SCHEMA,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const workspaceGraphDraftAudit = new StructuredWorkspaceGraphDraftAuditLogger(
    deps.app.log as unknown as Logger
  );
  const workspaceGraphDraftCapabilityService = new AuthorizeWorkspaceGraphDraftCapabilityService(
    deps.authenticator,
    deps.commandAuthorizer,
    () => new Date()
  );
  const getWorkspaceGraphDraftUseCase = new GetWorkspaceGraphDraftUseCase(
    workspaceGraphDraftStore,
    workspaceGraphDraftAudit
  );
  const saveWorkspaceGraphDraftUseCase = new SaveWorkspaceGraphDraftUseCase(
    workspaceGraphDraftStore,
    workspaceGraphDraftAudit,
    () => new Date()
  );

  return {
    workspaceGraphDraftStore,
    workspaceGraphDraftCapabilityService,
    getWorkspaceGraphDraftUseCase,
    saveWorkspaceGraphDraftUseCase,
  };
}

async function buildProtectedExecutionRuntime(deps: {
  readonly app: FastifyInstance;
  readonly env: Env;
  readonly observability: IObservability;
  readonly storageRuntime: ProtectedRuntimeStorage;
}) {
  const { AllowAllAuthorizer } = await import('@dvt/engine');
  const { adapters, close: closeAdapters } = await buildProviderAdapters(deps.env, {
    stateStore: deps.storageRuntime.stateStoreRoles.read,
    stateStoreWrite: deps.storageRuntime.stateStoreRoles.write,
    clock: deps.storageRuntime.systemClock,
    projector: deps.storageRuntime.projector,
    observability: deps.observability,
  });
  const startRunTargetAdapterRegistry = createStartRunTargetAdapterRegistryFromValues(
    adapters.keys()
  );

  if (deps.env.TEMPORAL_ADDRESS) {
    deps.app.log.info(`Temporal adapter registered (address=${deps.env.TEMPORAL_ADDRESS})`);
  }

  const { engine, runEnrichmentService, runHealthService } = buildWorkflowEngine({
    security: {
      authorizer: new AllowAllAuthorizer(),
      planRefAllowedSchemes: ['https', 's3', 'gs', 'azure', 'dvt-plan'],
    },
    persistence: {
      stateStoreRead: deps.storageRuntime.stateStoreRoles.read,
      stateStoreWrite: deps.storageRuntime.stateStoreRoles.write,
      intentStore: deps.storageRuntime.intentStore,
      planFetcher: deps.storageRuntime.planStore,
      runExecutionContextResolver: deps.storageRuntime.runExecutionContextResolver,
      runExecutionContextBindingPolicy: deps.storageRuntime.runExecutionContextBindingPolicy,
    },
    runtime: { adapters },
    infrastructure: {
      clock: deps.storageRuntime.systemClock,
      observability: deps.observability,
    },
  });

  return {
    adapters,
    closeAdapters,
    engine,
    runEnrichmentService,
    runHealthService,
    startRunTargetAdapterRegistry,
  };
}

export async function buildProtectedRuntimeModule(
  app: FastifyInstance,
  env: Env,
  observability: IObservability
): Promise<ProtectedRuntimeModule> {
  const databaseUrl = requireDatabaseUrl(env);
  const pool = getPgPool(databaseUrl);

  const adapterMod = await import('@dvt/adapter-postgres');
  const {
    PostgresBackpressureSnapshotReader,
    PostgresPlanStore,
    PostgresStateStoreAdapter,
    PostgresStartRunIntentStore,
  } = adapterMod;
  const { SnapshotProjector } = await import('@dvt/engine');
  const storageRuntime = buildProtectedRuntimeStorage({
    PostgresPlanStore,
    PostgresStateStoreAdapter,
    PostgresStartRunIntentStore,
    SnapshotProjector,
    databaseUrl,
    env,
    pool,
  });
  const admissionRuntime = buildProtectedAdmissionRuntime({
    PostgresBackpressureSnapshotReader,
    env,
    observability,
    pool,
  });
  const executionRuntime = await buildProtectedExecutionRuntime({
    app,
    env,
    observability,
    storageRuntime,
  });
  const securityRuntime = buildProtectedSecurityRuntime({
    app,
    env,
    pool,
  });
  const workspaceGraphDraftRuntime = buildWorkspaceGraphDraftRuntime({
    app,
    authenticator: securityRuntime.authenticator,
    commandAuthorizer: securityRuntime.commandAuthorizer,
    env,
    pool,
  });
  const startRunRuntime = buildProtectedStartRunRuntime({
    authenticator: securityRuntime.authenticator,
    commandAuthorizer: securityRuntime.commandAuthorizer,
    duplicateProbe: admissionRuntime.duplicateProbe,
    admissionGuard: admissionRuntime.admissionGuard,
    observability,
    backpressureMode: env.DVT_START_RUN_BACKPRESSURE_MODE,
    retryAfterSeconds: env.DVT_START_RUN_RETRY_AFTER_SECONDS,
    engine: executionRuntime.engine,
    adapters: executionRuntime.adapters,
    planStore: storageRuntime.planStore,
    stepTypeRegistry: storageRuntime.stepTypeRegistry,
  });

  return {
    facade: startRunRuntime.facade,
    authenticator: securityRuntime.authenticator,
    authorizer: securityRuntime.commandAuthorizer,
    engine: executionRuntime.engine,
    runEnrichmentService: executionRuntime.runEnrichmentService,
    runHealthService: executionRuntime.runHealthService,
    adapters: executionRuntime.adapters,
    startRunTargetAdapterRegistry: executionRuntime.startRunTargetAdapterRegistry,
    stateStore: storageRuntime.stateStoreRoles,
    planner: startRunRuntime.planner,
    planCompilePlanner: startRunRuntime.planCompilePlanner,
    planStore: storageRuntime.planStore,
    planValidator: startRunRuntime.planValidator,
    executablePlanResolver: storageRuntime.executablePlanResolver,
    workspaceGraphDraftStore: workspaceGraphDraftRuntime.workspaceGraphDraftStore,
    workspaceGraphDraftCapabilityService:
      workspaceGraphDraftRuntime.workspaceGraphDraftCapabilityService,
    getWorkspaceGraphDraftUseCase: workspaceGraphDraftRuntime.getWorkspaceGraphDraftUseCase,
    saveWorkspaceGraphDraftUseCase: workspaceGraphDraftRuntime.saveWorkspaceGraphDraftUseCase,
    migrate: async () => {
      await securityRuntime.accessRepo.migrate();
      await storageRuntime.stateStore.migrate();
      await storageRuntime.intentStore.migrate();
      await storageRuntime.planStore.migrate();
      await workspaceGraphDraftRuntime.workspaceGraphDraftStore.migrate();
    },
    close: async () => {
      await closeAllClosers([
        () => executionRuntime.closeAdapters(),
        () => storageRuntime.planStore.close(),
        () => workspaceGraphDraftRuntime.workspaceGraphDraftStore.close(),
        () => storageRuntime.stateStore.close(),
        () => storageRuntime.intentStore.close(),
        () => pool.end(),
      ]);
    },
  };
}
