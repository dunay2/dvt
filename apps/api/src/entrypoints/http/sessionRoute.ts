/** Owned concern: expose authenticated session profile for web route gating. */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';

import { authenticateHttpBearerRequest } from './httpBearerAuthentication.js';

type SessionRouteDeps = Readonly<{
  authenticator: IAuthenticator;
}>;

export async function sessionRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: SessionRouteDeps
): Promise<void> {
  const principal = await authenticateHttpBearerRequest(request, reply, deps.authenticator);
  if (principal === null) return;

  reply.code(200).send({
    principal: {
      principalId: principal.principalId,
      subjectId: principal.subjectId,
      principalType: principal.principalType,
      issuer: principal.issuer,
      audience: principal.audience,
      expiresAtIso: principal.expiresAt.toISOString(),
    },
    grants: {
      tenantIds: principal.assertedTenantIds,
      projectIds: principal.assertedProjectIds,
      scopes: principal.rawScopes,
    },
  });
}
