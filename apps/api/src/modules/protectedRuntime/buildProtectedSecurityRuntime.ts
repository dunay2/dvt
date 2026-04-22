/**
 * Owned concern: assemble the protected authentication and authorization
 * runtime services for `apps/api`.
 */
import type { Logger } from 'pino';

import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { TenantHierarchyAuthorizationPolicy } from '../../domain/auth/policy.js';
import { StructuredAuditLogger } from '../../infrastructure/audit/structuredAuditLogger.js';
import { JwksJwtVerifier } from '../../infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from '../../infrastructure/auth/oidcAuthenticator.js';
import { PostgresPrincipalAccessRepository } from '../../infrastructure/auth/postgresPrincipalAccessRepository.js';
import type { Env } from '../../plugins/env.js';

import type { RuntimePool } from './shared.js';

export type BuildProtectedSecurityRuntimeDeps = {
  readonly appLogger: Logger;
  readonly env: Env;
  readonly pool: RuntimePool;
};

export function buildProtectedSecurityRuntime(deps: BuildProtectedSecurityRuntimeDeps) {
  const accessRepo = new PostgresPrincipalAccessRepository(deps.pool, deps.env.DVT_PG_SCHEMA);
  const auditLogger = new StructuredAuditLogger(deps.appLogger);
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
