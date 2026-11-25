/** Owned concern: compose the protected ProjectDbtGraphFromFiles query route group. */
import type { FastifyInstance } from 'fastify';

import { CreateWorksheetDbtModel } from '../../application/services/createWorksheetDbtModel.js';
import { resolveWorksheetDbtModelDirectory } from '../../infrastructure/dbt/dbtProjectPathPolicy.js';
import { LocalWorkspaceFileBatchMutationGateway } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerDbtProjectGraphRoutes } from './dbtProjectGraphRoutes.js';
import { registerWorksheetDbtModelRoutes } from './worksheetDbtModelRoutes.js';

type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export function registerProtectedDbtProjectGraphRouteGroup(
  app: FastifyInstance,
  options: {
    readonly env: Env;
    readonly runtimeAuth: RuntimeAuth;
    readonly protectedModule: ProtectedRuntimeModule;
  }
): void {
  const rateLimit = {
    max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };
  const runtime = options.protectedModule;
  const root = runtime.workspaceFilesRoot;
  registerWorksheetDbtModelRoutes(app, {
    ...options.runtimeAuth,
    rateLimit,
    command: new CreateWorksheetDbtModel({
      files: new LocalWorkspaceFileRepository({ root }),
      batch: new LocalWorkspaceFileBatchMutationGateway({ root }),
      withLock: (key, action) =>
        runtime.canvasAuthoringAuthorityStore.withGraphArtifactPublicationLock(key, action),
      resolveAuthority: (scope, file) =>
        runtime.canvasAuthoringAuthorityPolicy.resolveFileContext(scope, file),
      modelDirectory: resolveWorksheetDbtModelDirectory,
      projectGraph: (input) => runtime.dbtProjectImport.projectGraphUseCase.execute(input),
    }),
  });
  registerDbtProjectGraphRoutes(app, {
    ...options.runtimeAuth,
    useCase: options.protectedModule.dbtProjectImport.projectGraphUseCase,
    rateLimit,
  });
}
