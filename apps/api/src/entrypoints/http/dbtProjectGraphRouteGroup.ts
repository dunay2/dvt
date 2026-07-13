/** Owned concern: compose the protected ProjectDbtGraphFromFiles query route group. */
import type { FastifyInstance } from 'fastify';

import { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';
import { DbtCliProjectAnalyzer } from '../../infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { resolveWorkspaceFilesRoot } from '../../infrastructure/workspaceFiles/resolveWorkspaceFilesRoot.js';
import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerDbtProjectGraphRoutes } from './dbtProjectGraphRoutes.js';

type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export function registerProtectedDbtProjectGraphRouteGroup(
  app: FastifyInstance,
  options: { readonly env: Env; readonly runtimeAuth: RuntimeAuth }
): void {
  const workspaceFilesRoot = resolveWorkspaceFilesRoot(options.env);
  const analyzer = new DbtCliProjectAnalyzer({
    workspaceFilesRoot,
    ...(options.env.DVT_DBT_ANALYZER_PROFILES_DIR === undefined
      ? {}
      : { profilesDirectory: options.env.DVT_DBT_ANALYZER_PROFILES_DIR }),
    dbtExecutable: options.env.DVT_DBT_ANALYZER_BIN,
    timeoutMs: options.env.DVT_DBT_ANALYZER_TIMEOUT_MS,
    maxOutputBytes: options.env.DVT_DBT_ANALYZER_MAX_OUTPUT_BYTES,
  });

  registerDbtProjectGraphRoutes(app, {
    ...options.runtimeAuth,
    useCase: new ProjectDbtGraphFromFilesUseCase({ analyzer }),
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
