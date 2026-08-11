/** Owned concern: expose server-owned effective workspace context for protected web routes. */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { IWorkspaceContextQuery } from '../../application/ports/workspaceContext.js';

import { authenticateHttpBearerRequest } from './httpBearerAuthentication.js';

type WorkspaceContextRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  adapterRegistry: IStartRunTargetAdapterRegistry;
  workspaceContextQuery: IWorkspaceContextQuery;
}>;

export async function workspaceContextRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: WorkspaceContextRouteDeps
): Promise<void> {
  const principal = await authenticateHttpBearerRequest(request, reply, deps.authenticator);
  if (principal === null) return;

  const context = await deps.workspaceContextQuery.getEffectiveWorkspaceContext(principal);
  if (context === null) {
    reply.code(403).send({
      error: {
        type: 'forbidden',
        reason: 'workspace_context_not_granted',
      },
    });
    return;
  }

  const availableTargetAdapters = deps.adapterRegistry.listSupported();
  const targetAdapter = availableTargetAdapters[0];
  if (!targetAdapter) {
    reply.code(503).send({
      error: {
        type: 'unavailable',
        reason: 'deployment_scope_not_available',
      },
    });
    return;
  }

  reply.code(200).send({
    ...context,
    deploymentScope: {
      targetAdapter,
      availableTargetAdapters,
    },
  });
}
