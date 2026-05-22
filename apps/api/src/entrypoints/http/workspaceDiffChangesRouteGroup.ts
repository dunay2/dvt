/**
 * Owned concern: compose the protected workspace diff-change query route group.
 */
import type { FastifyInstance } from 'fastify';

import { ListWorkspaceDiffChangesUseCase } from '../../application/services/listWorkspaceDiffChangesUseCase.js';
import { LocalWorkspaceDiffChangesRepository } from '../../infrastructure/workspaceDiffChanges/LocalWorkspaceDiffChangesRepository.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerWorkspaceDiffChangesRoutes } from './workspaceDiffChangesRoutes.js';

type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export type ProtectedWorkspaceDiffChangesRouteGroupOptions = {
  readonly env: Env;
  readonly runtimeAuth: RuntimeAuth;
};

export function registerProtectedWorkspaceDiffChangesRouteGroup(
  app: FastifyInstance,
  options: ProtectedWorkspaceDiffChangesRouteGroupOptions
): void {
  const repository = new LocalWorkspaceDiffChangesRepository({
    root: resolveWorkspaceDiffChangesRoot(options.env),
  });

  registerWorkspaceDiffChangesRoutes(app, {
    ...options.runtimeAuth,
    listUseCase: new ListWorkspaceDiffChangesUseCase(repository),
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}

function resolveWorkspaceDiffChangesRoot(env: Env): string {
  return env.DVT_WORKSPACE_FILES_ROOT ?? env.DVT_DBT_BUNDLE_FILE_ROOT ?? process.cwd();
}
