/** Owned concern: compose the protected ProjectDbtGraphFromFiles query route group. */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerDbtProjectGraphRoutes } from './dbtProjectGraphRoutes.js';

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
  registerDbtProjectGraphRoutes(app, {
    ...options.runtimeAuth,
    useCase: options.protectedModule.dbtProjectImport.projectGraphUseCase,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
