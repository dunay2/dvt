/** Owned concern: compose the protected AnalyzeSelectedDbtModel query route group. */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerDbtSelectedModelAnalysisRoutes } from './dbtSelectedModelAnalysisRoutes.js';

type RuntimeAuth = {
  readonly authenticator: ProtectedRuntimeModule['authenticator'];
  readonly authorizer: ProtectedRuntimeModule['authorizer'];
};

export function registerProtectedDbtSelectedModelAnalysisRouteGroup(
  app: FastifyInstance,
  options: {
    readonly env: Env;
    readonly runtimeAuth: RuntimeAuth;
    readonly protectedModule: ProtectedRuntimeModule;
  }
): void {
  registerDbtSelectedModelAnalysisRoutes(app, {
    ...options.runtimeAuth,
    query: options.protectedModule.dbtProjectImport.selectedModelAnalysisQuery,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
