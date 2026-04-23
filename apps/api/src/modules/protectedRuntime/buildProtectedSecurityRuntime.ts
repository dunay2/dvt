/**
 * Owned concern: assemble the protected authentication and authorization
 * runtime services for `apps/api`.
 */
import type { Logger } from 'pino';

import type { IAccessDecisionService } from '../../application/ports/accessDecision.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { StructuredAuditLogger } from '../../infrastructure/audit/structuredAuditLogger.js';
import { EmbeddedAccessDecisionService } from '../../infrastructure/auth/embeddedAccessDecisionService.js';
import { JwksJwtVerifier } from '../../infrastructure/auth/jwksJwtVerifier.js';
import { OidcAuthenticator } from '../../infrastructure/auth/oidcAuthenticator.js';
import type { Env } from '../../plugins/env.js';

import type { RuntimePool } from './shared.js';

export type BuildProtectedSecurityRuntimeDeps = {
  readonly appLogger: Logger;
  readonly env: Env;
  readonly pool: RuntimePool;
};

export type ProtectedSecurityRuntime = {
  readonly accessDecisionService: IAccessDecisionService;
  readonly migrateAccessDecisionService: () => Promise<void>;
  readonly commandAuthorizer: AuthorizeCommandScopeService;
  readonly authenticator: OidcAuthenticator;
};

export function buildProtectedSecurityRuntime(
  deps: BuildProtectedSecurityRuntimeDeps
): ProtectedSecurityRuntime {
  const embeddedAccessDecisionService = new EmbeddedAccessDecisionService(
    deps.pool,
    deps.env.DVT_PG_SCHEMA
  );
  const auditLogger = new StructuredAuditLogger(deps.appLogger);
  const commandAuthorizer = new AuthorizeCommandScopeService(
    embeddedAccessDecisionService,
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
    accessDecisionService: embeddedAccessDecisionService,
    migrateAccessDecisionService: () => embeddedAccessDecisionService.migrate(),
    commandAuthorizer,
    authenticator,
  };
}
