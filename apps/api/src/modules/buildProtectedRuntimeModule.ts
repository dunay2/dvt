import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { AuthorizeCommandScopeService } from '../application/services/authorizeCommandScopeService.js';
import { EngineStartRunUseCase } from '../application/services/engineStartRunUseCase.js';
import { StartRunAuthorizedFacade } from '../application/services/startRunAuthorizedFacade.js';
import { buildWorkflowEngine } from '../application/services/WorkflowEngineFactory.js';
import { getPgPool } from '../db/pool.js';
import { TenantHierarchyAuthorizationPolicy } from '../domain/auth/policy.js';
import { StructuredAuditLogger } from '../infrastructure/audit/structuredAuditLogger.js';
import { JwksJwtVerifier } from '../infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from '../infrastructure/auth/oidcAuthenticator.js';
import { PostgresPrincipalAccessRepository } from '../infrastructure/auth/postgresPrincipalAccessRepository.js';
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
  const { PostgresStateStoreAdapter, PostgresStartRunIntentStore } = adapterMod;
  const { AllowAllAuthorizer, SnapshotProjector } = engineMod;

  const stateStore = new PostgresStateStoreAdapter({ connectionString: databaseUrl });
  const intentStore = new PostgresStartRunIntentStore({ connectionString: databaseUrl });
  const projector = new SnapshotProjector();

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
    new EngineStartRunUseCase(engine)
  );

  return {
    facade,
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
