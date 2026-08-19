/**
 * Owned concern: orchestrate protected runtime HTTP route-group registration.
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

import { ListWorkspaceFileHistoryUseCase } from '../../application/services/listWorkspaceFileHistoryUseCase.js';
import { LocalWorkspaceFileHistoryRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileHistoryRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerProtectedDbtDependencyEditRouteGroup } from './dbtDependencyEditRouteGroup.js';
import { registerProtectedDbtProjectGraphRouteGroup } from './dbtProjectGraphRouteGroup.js';
import { registerProtectedDbtProjectImportRouteGroup } from './dbtProjectImportRouteGroup.js';
import { registerProtectedDbtSelectedModelAnalysisRouteGroup } from './dbtSelectedModelAnalysisRouteGroup.js';
import { registerProtectedDbtYamlDescriptionEditRouteGroup } from './dbtYamlDescriptionEditRouteGroup.js';
import { registerProtectedGraphDbtModelCompilationRouteGroup } from './graphDbtModelCompilationRouteGroup.js';
import { registerProtectedGraphDbtWorkspaceArtifactPublicationRouteGroup } from './graphDbtWorkspaceArtifactPublicationRouteGroup.js';
import { registerProjectOnboardingRoutes } from './projectOnboardingRoutes.js';
import { registerProtectedAdminRouteGroup } from './protectedRuntimeAdminRouteGroup.js';
import { registerProtectedPlanRoutes } from './protectedRuntimePlanRoutes.js';
import { buildProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { registerProtectedRunRoutes } from './protectedRuntimeRunRoutes.js';
import { registerProtectedSessionRoutes } from './protectedRuntimeSessionRoutes.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import { registerProtectedWarehouseSourceImportRouteGroup } from './warehouseSourceImportRouteGroup.js';
import { workspaceContextRoute } from './workspaceContextRoute.js';
import { registerProtectedWorkspaceDiffChangesRouteGroup } from './workspaceDiffChangesRouteGroup.js';
import { registerWorkspaceFileHistoryRoutes } from './workspaceFileHistoryRoutes.js';
import { registerProtectedWorkspaceFilesRouteGroup } from './workspaceFilesRouteGroup.js';
import { registerWorkspaceGraphDraftRoutes } from './workspaceGraphDraftRoutes.js';
import { registerProtectedWorkspacePluginCatalogRouteGroup } from './workspacePluginCatalogRouteGroup.js';

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
  const protectedRateLimit = {
    max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };

  registerProtectedSessionRoutes(app, env, protectedModule);
  registerProtectedPlanRoutes(app, env, protectedModule, dependencies);
  registerProjectOnboardingRoutes(app, {
    authenticator: protectedModule.authenticator,
    listProjectsUseCase: protectedModule.listProjectsUseCase,
    createProjectUseCase: protectedModule.createProjectUseCase,
    rateLimit: protectedRateLimit,
  });
  app.get(
    RUNTIME_ROUTE_PATH.workspaceContext,
    { config: { rateLimit: protectedRateLimit } },
    async (request, reply) =>
      workspaceContextRoute(request, reply, {
        adapterRegistry: protectedModule.startRunTargetAdapterRegistry,
        authenticator: protectedModule.authenticator,
        workspaceContextQuery: protectedModule.workspaceContextQuery,
      })
  );
  registerProtectedWorkspacePluginCatalogRouteGroup(app, env, protectedModule);
  registerWorkspaceGraphDraftRoutes(app, {
    authenticator: dependencies.runtimeAuth.authenticator,
    capabilityService: protectedModule.workspaceGraphDraftCapabilityService,
    getUseCase: protectedModule.getWorkspaceGraphDraftUseCase,
    saveUseCase: protectedModule.saveWorkspaceGraphDraftUseCase,
    telemetry: dependencies.workspaceGraphDraftTelemetry,
    observability,
    rateLimit: protectedRateLimit,
  });
  registerProtectedDbtProjectGraphRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    protectedModule,
  });
  registerProtectedDbtSelectedModelAnalysisRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    protectedModule,
  });
  registerProtectedDbtDependencyEditRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    protectedModule,
  });
  registerProtectedDbtProjectImportRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    protectedModule,
  });
  registerProtectedDbtYamlDescriptionEditRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    protectedModule,
  });
  registerProtectedGraphDbtWorkspaceArtifactPublicationRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    protectedModule,
  });
  registerProtectedGraphDbtModelCompilationRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    protectedModule,
  });
  registerProtectedWorkspaceDiffChangesRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
  });
  registerProtectedWarehouseSourceImportRouteGroup(app, {
    env,
    protectedModule,
    runtimeAuth: dependencies.runtimeAuth,
    connectionProbe: dependencies.warehouseConnectionProbe,
    previewSourceRowsUseCase: dependencies.previewWarehouseSourceObjectRowsUseCase,
    validatePostgresTransformSqlUseCase: dependencies.validatePostgresTransformSqlUseCase,
  });
  registerWorkspaceFileHistoryRoutes(app, {
    ...dependencies.runtimeAuth,
    listUseCase: new ListWorkspaceFileHistoryUseCase(
      new LocalWorkspaceFileHistoryRepository({
        root: protectedModule.workspaceFilesRoot,
      })
    ),
    rateLimit: {
      max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
  registerProtectedWorkspaceFilesRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    workspaceFilesRoot: protectedModule.workspaceFilesRoot,
  });
  registerProtectedRunRoutes(app, env, protectedModule, dependencies);
  registerProtectedAdminRouteGroup(app, env, protectedModule, dependencies.runtimeAuth);

  app.log.info('protected runtime routes registered');
}
