/** Owned concern: compose the protected graph-derived dbt artifact publication rail. */
import type { FastifyInstance } from 'fastify';

import { PublishGraphDbtWorkspaceArtifactsCommand } from '../../application/services/graphDbtWorkspaceArtifactPublication/PublishGraphDbtWorkspaceArtifactsCommand.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerGraphDbtWorkspaceArtifactPublicationRoutes } from './graphDbtWorkspaceArtifactPublicationRoutes.js';

export function registerProtectedGraphDbtWorkspaceArtifactPublicationRouteGroup(
  app: FastifyInstance,
  options: Readonly<{
    env: Env;
    runtimeAuth: Pick<ProtectedRuntimeModule, 'authenticator' | 'authorizer'>;
    protectedModule: ProtectedRuntimeModule;
  }>
): void {
  const command = new PublishGraphDbtWorkspaceArtifactsCommand(
    new LocalWorkspaceFileBatchMutationGateway({
      root: options.protectedModule.workspaceFilesRoot,
    })
  );

  registerGraphDbtWorkspaceArtifactPublicationRoutes(app, {
    ...options.runtimeAuth,
    command,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
