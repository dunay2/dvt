/**
 * Owned concern: compose the protected workspace-file query route group.
 */
import type { FastifyInstance } from 'fastify';

import { GetWorkspaceFileContentUseCase } from '../../application/services/getWorkspaceFileContentUseCase.js';
import { ListWorkspaceFilesUseCase } from '../../application/services/listWorkspaceFilesUseCase.js';
import { LocalWorkspaceFileRepository } from '../../infrastructure/workspaceFiles/LocalWorkspaceFileRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerWorkspaceFilesRoutes } from './workspaceFilesRoutes.js';

type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export type ProtectedWorkspaceFilesRouteGroupOptions = {
  readonly env: Env;
  readonly runtimeAuth: RuntimeAuth;
};

export function registerProtectedWorkspaceFilesRouteGroup(
  app: FastifyInstance,
  options: ProtectedWorkspaceFilesRouteGroupOptions
): void {
  const repository = new LocalWorkspaceFileRepository({
    root: resolveWorkspaceFilesRoot(options.env),
  });

  registerWorkspaceFilesRoutes(app, {
    ...options.runtimeAuth,
    getUseCase: new GetWorkspaceFileContentUseCase(repository),
    listUseCase: new ListWorkspaceFilesUseCase(repository),
  });
}

function resolveWorkspaceFilesRoot(env: Env): string {
  return env.DVT_WORKSPACE_FILES_ROOT ?? env.DVT_DBT_BUNDLE_FILE_ROOT ?? process.cwd();
}
