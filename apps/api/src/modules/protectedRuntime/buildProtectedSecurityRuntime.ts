/**
 * Owned concern: assemble the protected authentication and authorization
 * runtime services for `apps/api`.
 */
import type { Logger } from 'pino';

import type { IAccessDecisionService } from '../../application/ports/accessDecision.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { CreateProjectUseCase } from '../../application/services/createProjectUseCase.js';
import { ListProjectsUseCase } from '../../application/services/listProjectsUseCase.js';
import { ListWorkspacePluginsUseCase } from '../../application/services/listWorkspacePluginsUseCase.js';
import {
  CompositeAuthAuditPort,
  PostgresAuthAuditAdapter,
} from '../../infrastructure/audit/PostgresAuthAuditAdapter.js';
import { StructuredAuditLogger } from '../../infrastructure/audit/structuredAuditLogger.js';
import { EmbeddedAccessDecisionService } from '../../infrastructure/auth/embeddedAccessDecisionService.js';
import { EmbeddedPrincipalGrantRepository } from '../../infrastructure/auth/embeddedPrincipalGrantRepository.js';
import { EmbeddedProjectOnboardingRepository } from '../../infrastructure/auth/embeddedProjectOnboardingRepository.js';
import { EmbeddedWorkspaceContextQuery } from '../../infrastructure/auth/embeddedWorkspaceContextQuery.js';
import { JwksJwtVerifier } from '../../infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from '../../infrastructure/auth/oidcAuthenticator.js';
import { EmbeddedWorkspacePluginCatalogRepository } from '../../infrastructure/workspacePlugins/EmbeddedWorkspacePluginCatalogRepository.js';
import type { Env } from '../../plugins/env.js';

import type { RuntimePool } from './shared.js';

export type BuildProtectedSecurityRuntimeDeps = {
  readonly appLogger: Logger;
  readonly env: Env;
  readonly pool: RuntimePool;
};

export type ProtectedSecurityRuntime = {
  readonly accessDecisionService: IAccessDecisionService;
  readonly workspaceContextQuery: EmbeddedWorkspaceContextQuery;
  readonly listProjectsUseCase: ListProjectsUseCase;
  readonly createProjectUseCase: CreateProjectUseCase;
  readonly listWorkspacePluginsUseCase: ListWorkspacePluginsUseCase;
  readonly migrateAccessDecisionService: () => Promise<void>;
  readonly migrateProjectOnboardingRepository: () => Promise<void>;
  readonly migrateWorkspacePluginCatalogRepository: () => Promise<void>;
  readonly ensureAuthAuditSchema: () => Promise<void>;
  readonly commandAuthorizer: AuthorizeCommandScopeService;
  readonly authenticator: OidcAuthenticator;
};

export function buildProtectedSecurityRuntime(
  deps: BuildProtectedSecurityRuntimeDeps
): ProtectedSecurityRuntime {
  const principalGrantRepository = new EmbeddedPrincipalGrantRepository(
    deps.pool,
    deps.env.DVT_PG_SCHEMA
  );
  const embeddedAccessDecisionService = new EmbeddedAccessDecisionService(principalGrantRepository);
  const workspaceContextQuery = new EmbeddedWorkspaceContextQuery(
    principalGrantRepository,
    deps.pool,
    deps.env.DVT_PG_SCHEMA
  );
  const projectOnboardingRepository = new EmbeddedProjectOnboardingRepository(
    deps.pool,
    deps.env.DVT_PG_SCHEMA
  );
  const workspacePluginCatalogRepository = new EmbeddedWorkspacePluginCatalogRepository(
    deps.pool,
    deps.env.DVT_PG_SCHEMA
  );
  const durableAudit = new PostgresAuthAuditAdapter(deps.pool, deps.env.DVT_PG_SCHEMA);
  const audit = new CompositeAuthAuditPort([
    durableAudit,
    new StructuredAuditLogger(deps.appLogger),
  ]);
  const commandAuthorizer = new AuthorizeCommandScopeService(
    embeddedAccessDecisionService,
    audit,
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
    accessDecisionService: embeddedAccessDecisionService,
    workspaceContextQuery,
    listProjectsUseCase: new ListProjectsUseCase(projectOnboardingRepository),
    createProjectUseCase: new CreateProjectUseCase(projectOnboardingRepository),
    listWorkspacePluginsUseCase: new ListWorkspacePluginsUseCase(workspacePluginCatalogRepository),
    migrateAccessDecisionService: () => embeddedAccessDecisionService.migrate(),
    migrateProjectOnboardingRepository: () => projectOnboardingRepository.migrate(),
    migrateWorkspacePluginCatalogRepository: () => workspacePluginCatalogRepository.migrate(),
    ensureAuthAuditSchema: () => durableAudit.ensureSchema(),
    commandAuthorizer,
    authenticator,
  };
}
