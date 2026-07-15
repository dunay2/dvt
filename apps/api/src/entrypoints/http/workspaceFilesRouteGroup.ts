/**
 * Owned concern: compose the protected workspace-file query route group.
 */
import type { FastifyInstance } from 'fastify';

import { GetWorkspaceFileContentUseCase } from '../../application/services/getWorkspaceFileContentUseCase.js';
import { ListWorkspaceFilesUseCase } from '../../application/services/listWorkspaceFilesUseCase.js';
import { SaveWorkspaceFileContentUseCase } from '../../application/services/saveWorkspaceFileContentUseCase.js';
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
  readonly workspaceFilesRoot: string;
};

export function registerProtectedWorkspaceFilesRouteGroup(
  app: FastifyInstance,
  options: ProtectedWorkspaceFilesRouteGroupOptions
): void {
  const repository = new LocalWorkspaceFileRepository({
    root: options.workspaceFilesRoot,
  });

  registerWorkspaceFilesRoutes(app, {
    ...options.runtimeAuth,
    getUseCase: new GetWorkspaceFileContentUseCase(repository),
    listUseCase: new ListWorkspaceFilesUseCase(repository),
    saveUseCase: new SaveWorkspaceFileContentUseCase(repository),
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
