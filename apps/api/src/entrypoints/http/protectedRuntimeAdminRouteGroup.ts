/**
 * Owned concern: register optional protected runtime admin repair routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerAdminRoutes } from './adminRoutes.js';
import type { RuntimeAuth } from './protectedRuntimeRouteDependencies.js';

export function registerProtectedAdminRouteGroup(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule,
  runtimeAuth: RuntimeAuth
): void {
  if (env.DVT_ADMIN_ROUTES_ENABLED) {
    registerAdminRoutes(app, protectedModule.stateStore.maintenance, runtimeAuth);
    app.log.warn('admin routes enabled: POST /admin/runs/:runId/rebuild-snapshot');
  }
}
