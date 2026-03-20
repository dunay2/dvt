import { StartRunAdmissionGuard } from '@dvt/delivery';
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import { BackpressureAwareStartRunUseCase } from '../application/services/BackpressureAwareStartRunUseCase.js';
import { EngineStartRunUseCase } from '../application/services/engineStartRunUseCase.js';
import { NoopAdmissionTelemetry } from '../application/services/NoopAdmissionTelemetry.js';
import { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';
import { buildWorkflowEngine } from '../application/services/WorkflowEngineFactory.js';
import { getPgPool } from '../db/pool.js';
import { TenantHierarchyAuthorizationPolicy } from '../domain/auth/policy.js';
import { StructuredAuditLogger } from '../infrastructure/audit/structuredAuditLogger.js';
import { JwksJwtVerifier } from '../infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from '../infrastructure/auth/oidcAuthenticator.js';
import { PostgresPrincipalAccessRepository } from '../infrastructure/auth/postgresPrincipalAccessRepository.js';
import { RawSqlBackpressureStore } from '../infrastructure/backpressure/RawSqlBackpressureStore.js';
import { PostgresDuplicateRunProbe } from '../infrastructure/startRun/PostgresDuplicateRunProbe.js';
import type { Env } from '../plugins/env.js';

import { buildProviderAdapters } from './buildProviderAdapters.js';
import type { ProtectedRuntimeModule } from './types.js';

function requireDatabaseUrl(env: Env): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required when OIDC-protected runtime routes are enabled');
  }
  return env.DATABASE_URL;
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
  const intentStore = new PostgresStartRunIntentStore({
    connectionString: databaseUrl,
    schema: env.DVT_PG_SCHEMA,
    statementTimeoutMs: env.DVT_PG_STATEMENT_TIMEOUT_MS,
    queryTimeoutMs: env.DVT_PG_QUERY_TIMEOUT_MS,
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
  const admissionGuard = new StartRunAdmissionGuard({
    backpressureStore: new RawSqlBackpressureStore(backpressureReader),
    policy: {
      maxPendingEventsPerTenant: env.DVT_START_RUN_MAX_PENDING_EVENTS_PER_TENANT,
      maxOutboxLagMs: env.DVT_START_RUN_MAX_OUTBOX_LAG_MS,
    },
  });

  const { adapters, close: closeAdapters } = await buildProviderAdapters(env, {
    stateStore,
    projector,
    observability,
  });

  if (env.TEMPORAL_ADDRESS) {
    app.log.info(`Temporal adapter registered (address=${env.TEMPORAL_ADDRESS})`);
  }

  const engine = buildWorkflowEngine({
    security: {
      authorizer: new AllowAllAuthorizer(),
      planRefAllowedSchemes: ['https', 's3', 'gs', 'azure'],
    },
    persistence: { stateStore, intentStore },
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
      telemetry: new NoopAdmissionTelemetry(),
      mode: env.DVT_START_RUN_BACKPRESSURE_MODE,
      retryAfterSeconds: env.DVT_START_RUN_RETRY_AFTER_SECONDS,
      delegate: new EngineStartRunUseCase(engine),
    })
  );

  return {
    facade,
    authenticator,
    authorizer: commandAuthorizer,
    engine,
    adapters,
    stateStore,
    migrate: async () => {
      await accessRepo.migrate();
      await stateStore.migrate();
      await intentStore.migrate();
    },
    close: async () => {
      await closeAdapters();
      await stateStore.close();
      await intentStore.close();
      await pool.end();
    },
  };
}
