/**
 * Owned concern: orchestrate protected runtime HTTP route-group registration.
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerProtectedAdminRouteGroup } from './protectedRuntimeAdminRouteGroup.js';
import { registerProtectedPlanRoutes } from './protectedRuntimePlanRoutes.js';
import { buildProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { registerProtectedRunRoutes } from './protectedRuntimeRunRoutes.js';
import { registerProtectedWorkspaceGraphDraftRouteGroup } from './protectedRuntimeWorkspaceGraphDraftRouteGroup.js';
import { PROTECTED_RUNTIME_ROUTE_SUMMARY } from './runtimeRoutes.constants.js';
import { registerProtectedWorkspaceFilesRouteGroup } from './workspaceFilesRouteGroup.js';

export type RegisterProtectedRuntimeRoutesOptions = {
  readonly env: Env;
  readonly observability: IObservability;
  readonly protectedModule: ProtectedRuntimeModule;
};

export async function registerProtectedRuntimeRoutes(
  app: FastifyInstance,
  options: RegisterProtectedRuntimeRoutesOptions
): Promise<void> {
  const { env, observability, protectedModule } = options;
  const dependencies = buildProtectedRuntimeRouteDependencies(options);

  registerProtectedPlanRoutes(app, env, protectedModule, dependencies);
  registerProtectedWorkspaceGraphDraftRouteGroup(app, observability, protectedModule, dependencies);
  registerProtectedWorkspaceFilesRouteGroup(app, { env, runtimeAuth: dependencies.runtimeAuth });
  registerProtectedRunRoutes(app, env, protectedModule, dependencies);
  registerProtectedAdminRouteGroup(app, env, protectedModule, dependencies.runtimeAuth);

  app.log.info(`protected runtime routes registered: ${PROTECTED_RUNTIME_ROUTE_SUMMARY}`);
}
