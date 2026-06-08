/** Owned concern: expose server-owned effective workspace context for protected web routes. */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { IWorkspaceContextQuery } from '../../application/ports/workspaceContext.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';

import { extractBearerToken } from './authHeaders.js';

type WorkspaceContextRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  adapterRegistry?: IStartRunTargetAdapterRegistry;
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

  const adapterRegistry = deps.adapterRegistry ?? DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY;
  const availableTargetAdapters = adapterRegistry.listSupported();
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
