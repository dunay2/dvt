/** Owned concern: bind protected dbt project import application services to HTTP. */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerDbtProjectImportRoutes } from './dbtProjectImportRoutes.js';
import type { RuntimeAuth } from './protectedRuntimeRouteDependencies.js';

export function registerProtectedDbtProjectImportRouteGroup(
  app: FastifyInstance,
  options: {
    readonly env: Env;
    readonly runtimeAuth: RuntimeAuth;
    readonly protectedModule: ProtectedRuntimeModule;
  }
): void {
  registerDbtProjectImportRoutes(app, {
    ...options.runtimeAuth,
    validateUseCase: options.protectedModule.dbtProjectImport.validateUseCase,
    importUseCase: options.protectedModule.dbtProjectImport.importUseCase,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
