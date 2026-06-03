/**
 * Owned concern: register protected workspace plugin catalog HTTP routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerWorkspacePluginCatalogRoutes } from './workspacePluginCatalogRoutes.js';

export function registerProtectedWorkspacePluginCatalogRouteGroup(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule
): void {
  registerWorkspacePluginCatalogRoutes(app, {
    authenticator: protectedModule.authenticator,
    authorizer: protectedModule.authorizer,
    listWorkspacePluginsUseCase: protectedModule.listWorkspacePluginsUseCase,
    rateLimit: {
      max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
