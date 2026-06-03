/** Owned concern: expose authenticated session profile for web route gating. */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';

import { extractBearerToken } from './authHeaders.js';

type SessionRouteDeps = Readonly<{
  authenticator: IAuthenticator;
}>;

export async function sessionRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: SessionRouteDeps
): Promise<void> {
  const authResult = await deps.authenticator.authenticateBearerToken(
    extractBearerToken(request.headers.authorization)
  );
  if (!authResult.ok) {
    reply.code(401).send({
      error: {
        type: 'unauthorized',
        reason: 'authentication_failed',
      },
    });
    return;
  }

  const principal = authResult.principal;
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
