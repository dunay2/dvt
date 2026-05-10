/** Owned concern: expose server-owned effective workspace context for protected web routes. */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IWorkspaceContextQuery } from '../../application/ports/workspaceContext.js';

import { extractBearerToken } from './authHeaders.js';

type WorkspaceContextRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  workspaceContextQuery: IWorkspaceContextQuery;
}>;

export async function workspaceContextRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: WorkspaceContextRouteDeps
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

  const context = await deps.workspaceContextQuery.getEffectiveWorkspaceContext(
    authResult.principal
  );
  if (context === null) {
    reply.code(403).send({
      error: {
        type: 'forbidden',
        reason: 'workspace_context_not_granted',
      },
    });
    return;
  }

  reply.code(200).send(context);
}
