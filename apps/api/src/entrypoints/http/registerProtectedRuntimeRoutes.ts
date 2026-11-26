/**
 * Owned concern: orchestrate protected runtime HTTP route-group registration.
 */
/**
 * Owned concern: orchestrate protected runtime HTTP route-group registration.
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

import { ListWorkspaceFileHistoryUseCase } from '../../application/services/listWorkspaceFileHistoryUseCase.js';
import { LocalWorkspaceFileHistoryRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileHistoryRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerCanvasModelSqlRoutes } from './canvasModelSqlRoutes.js';
import { registerCanvasTransformDataSampleRoutes } from './canvasTransformDataSampleRoutes.js';
import { registerCanvasTransformSqlRoutes } from './canvasTransformSqlRoutes.js';
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
import { registerSqlWorksheetRouteGroup } from './sqlWorksheetRouteGroup.js';
import { registerProtectedWarehouseSourceImportRouteGroup } from './warehouseSourceImportRouteGroup.js';
import { registerWorksheetCanvasModelRoutes } from './worksheetCanvasModelRoutes.js';
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
  const { env, protectedModule } = options;
  const dependencies = buildProtectedRuntimeRouteDependencies(options);
  const protectedRateLimit = {
    max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };

  registerProtectedSessionRoutes(app, env, protectedModule);
  registerProtectedPlanRoutes(app, env, protectedModule, dependencies);
  registerProtectedWorkspaceContextRoutes(app, options, protectedRateLimit);
  registerProtectedWorkspacePluginCatalogRouteGroup(app, env, protectedModule);
  registerProtectedCanvasRoutes(app, options, dependencies, protectedRateLimit);
  registerProtectedDbtRoutes(app, options, dependencies);
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
  registerSqlWorksheetRouteGroup(app, {
    protectedModule,
    runtimeAuth: dependencies.runtimeAuth,
    rateLimit: protectedRateLimit,
  });
  registerProtectedWorkspaceFileRoutes(app, options, dependencies, protectedRateLimit);
  registerProtectedRunRoutes(app, env, protectedModule, dependencies);
  registerProtectedAdminRouteGroup(app, env, protectedModule, dependencies.runtimeAuth);

  app.log.info('protected runtime routes registered');
}

function registerProtectedWorkspaceContextRoutes(
  app: FastifyInstance,
  { protectedModule }: RegisterProtectedRuntimeRoutesOptions,
  protectedRateLimit: { max: number; timeWindow: number }
): void {
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
}

function registerProtectedDbtRoutes(
  app: FastifyInstance,
  { env, protectedModule }: RegisterProtectedRuntimeRoutesOptions,
  dependencies: ReturnType<typeof buildProtectedRuntimeRouteDependencies>
): void {
  const dbtRouteGroups = [
    registerProtectedDbtProjectGraphRouteGroup,
    registerProtectedDbtSelectedModelAnalysisRouteGroup,
    registerProtectedDbtDependencyEditRouteGroup,
    registerProtectedDbtProjectImportRouteGroup,
    registerProtectedDbtYamlDescriptionEditRouteGroup,
    registerProtectedGraphDbtWorkspaceArtifactPublicationRouteGroup,
    registerProtectedGraphDbtModelCompilationRouteGroup,
  ];
  for (const registerGroup of dbtRouteGroups) {
    registerGroup(app, { env, runtimeAuth: dependencies.runtimeAuth, protectedModule });
  }
}

function registerProtectedWorkspaceFileRoutes(
  app: FastifyInstance,
  { env, protectedModule }: RegisterProtectedRuntimeRoutesOptions,
  dependencies: ReturnType<typeof buildProtectedRuntimeRouteDependencies>,
  protectedRateLimit: { max: number; timeWindow: number }
): void {
  const fileHistory = new LocalWorkspaceFileHistoryRepository({
    root: protectedModule.workspaceFilesRoot,
  });
  registerWorkspaceFileHistoryRoutes(app, {
    ...dependencies.runtimeAuth,
    listUseCase: new ListWorkspaceFileHistoryUseCase(fileHistory),
    versionQuery: fileHistory,
    versionCommand: fileHistory,
    rateLimit: protectedRateLimit,
  });
  registerProtectedWorkspaceFilesRouteGroup(app, {
    env,
    runtimeAuth: dependencies.runtimeAuth,
    workspaceFilesRoot: protectedModule.workspaceFilesRoot,
    dbtProjectRootRelocation: protectedModule.dbtProjectRootRelocation,
    canvasAuthoringAuthorityPolicy: protectedModule.canvasAuthoringAuthorityPolicy,
  });
}

function registerProtectedCanvasRoutes(
  app: FastifyInstance,
  { observability, protectedModule }: RegisterProtectedRuntimeRoutesOptions,
  dependencies: ReturnType<typeof buildProtectedRuntimeRouteDependencies>,
  protectedRateLimit: { max: number; timeWindow: number }
): void {
  registerWorkspaceGraphDraftRoutes(app, {
    authenticator: dependencies.runtimeAuth.authenticator,
    capabilityService: protectedModule.workspaceGraphDraftCapabilityService,
    getUseCase: protectedModule.getWorkspaceGraphDraftUseCase,
    saveUseCase: protectedModule.saveWorkspaceGraphDraftUseCase,
    telemetry: dependencies.workspaceGraphDraftTelemetry,
    observability,
    rateLimit: protectedRateLimit,
  });
  registerCanvasTransformDataSampleRoutes(app, {
    ...dependencies.runtimeAuth,
    query: dependencies.previewCanvasTransformRowsUseCase,
    rateLimit: protectedRateLimit,
  });
  registerCanvasTransformSqlRoutes(app, {
    ...dependencies.runtimeAuth,
    query: dependencies.projectCanvasTransformSqlQuery,
    rateLimit: protectedRateLimit,
  });
  registerCanvasModelSqlRoutes(app, {
    ...dependencies.runtimeAuth,
    context: dependencies.modelSqlContext,
    compilation: dependencies.modelSqlCompilation,
    rows: dependencies.previewCanvasTransformRowsUseCase,
    rateLimit: protectedRateLimit,
  });
  registerWorksheetCanvasModelRoutes(app, {
    ...dependencies.runtimeAuth,
    query: dependencies.worksheetCanvasModelQuery,
    rateLimit: protectedRateLimit,
  });
}
