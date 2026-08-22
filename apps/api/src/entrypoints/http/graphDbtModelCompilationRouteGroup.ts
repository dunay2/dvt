/** Owned concern: compose the protected CompileGraphDbtModels query route group. */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerGraphDbtModelCompilationRoutes } from './graphDbtModelCompilationRoutes.js';

type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export function registerProtectedGraphDbtModelCompilationRouteGroup(
  app: FastifyInstance,
  options: {
    readonly env: Env;
    readonly runtimeAuth: RuntimeAuth;
    readonly protectedModule: ProtectedRuntimeModule;
  }
): void {
  registerGraphDbtModelCompilationRoutes(app, {
    ...options.runtimeAuth,
    query: options.protectedModule.dbtProjectImport.graphModelCompilationQuery,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
