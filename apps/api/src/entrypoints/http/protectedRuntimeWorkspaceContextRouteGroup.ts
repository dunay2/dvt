/**
 * Owned concern: register protected runtime workspace-context HTTP routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import { workspaceContextRoute } from './workspaceContextRoute.js';

export function registerProtectedWorkspaceContextRouteGroup(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule
): void {
  const rateLimit = {
    max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };

  app.get(RUNTIME_ROUTE_PATH.workspaceContext, { config: { rateLimit } }, async (request, reply) =>
    workspaceContextRoute(request as never, reply as never, {
      authenticator: protectedModule.authenticator,
      workspaceContextQuery: protectedModule.workspaceContextQuery,
    })
  );
}
