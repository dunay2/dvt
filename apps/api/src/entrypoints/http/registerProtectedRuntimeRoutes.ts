/**
 * Owned concern: orchestrate protected runtime HTTP route-group registration.
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

import { ListWorkspaceFileHistoryUseCase } from '../../application/services/listWorkspaceFileHistoryUseCase.js';
import { LocalWorkspaceFileHistoryRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileHistoryRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerProtectedAdminRouteGroup } from './protectedRuntimeAdminRouteGroup.js';
import { registerProtectedPlanRoutes } from './protectedRuntimePlanRoutes.js';
import { buildProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { registerProtectedRunRoutes } from './protectedRuntimeRunRoutes.js';
import { registerProtectedWorkspaceContextRouteGroup } from './protectedRuntimeWorkspaceContextRouteGroup.js';
import { registerProtectedWorkspaceGraphDraftRouteGroup } from './protectedRuntimeWorkspaceGraphDraftRouteGroup.js';
import { PROTECTED_RUNTIME_ROUTE_SUMMARY } from './runtimeRoutes.constants.js';
import { registerProtectedWorkspaceDiffChangesRouteGroup } from './workspaceDiffChangesRouteGroup.js';
import { registerWorkspaceFileHistoryRoutes } from './workspaceFileHistoryRoutes.js';
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
  registerProtectedWorkspaceContextRouteGroup(app, env, protectedModule);
  registerProtectedWorkspaceGraphDraftRouteGroup(app, observability, protectedModule, dependencies);
  registerProtectedWorkspaceDiffChangesRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
  });
  registerWorkspaceFileHistoryRoutes(app, {
    ...dependencies.runtimeAuth,
    listUseCase: new ListWorkspaceFileHistoryUseCase(
      new LocalWorkspaceFileHistoryRepository({
        root: env.DVT_WORKSPACE_FILES_ROOT ?? env.DVT_DBT_BUNDLE_FILE_ROOT ?? process.cwd(),
      })
    ),
    rateLimit: {
      max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
  registerProtectedWorkspaceFilesRouteGroup(app, { env, runtimeAuth: dependencies.runtimeAuth });
  registerProtectedRunRoutes(app, env, protectedModule, dependencies);
  registerProtectedAdminRouteGroup(app, env, protectedModule, dependencies.runtimeAuth);

  app.log.info(`protected runtime routes registered: ${PROTECTED_RUNTIME_ROUTE_SUMMARY}`);
}
