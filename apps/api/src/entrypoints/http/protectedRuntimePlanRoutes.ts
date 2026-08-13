/**
 * Owned concern: register protected plan lifecycle HTTP routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { compilePlanRoute } from './compilePlanRoute.js';
import { importPlanRoute } from './importPlanRoute.js';
import { previewPlanRoute } from './previewPlanRoute.js';
import type { ProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

export function registerProtectedPlanRoutes(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule,
  dependencies: ProtectedRuntimeRouteDependencies
): void {
  const rateLimit = {
    max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };

  app.post(RUNTIME_ROUTE_PATH.plansPreview, { config: { rateLimit } }, async (request, reply) =>
    previewPlanRoute(request as never, reply, {
      authenticator: protectedModule.authenticator,
      authorizer: protectedModule.authorizer,
      useCase: dependencies.previewPlanUseCase,
    })
  );
  app.post(RUNTIME_ROUTE_PATH.plansCompile, { config: { rateLimit } }, async (request, reply) =>
    compilePlanRoute(request as never, reply, {
      authenticator: protectedModule.authenticator,
      authorizer: protectedModule.authorizer,
      useCase: dependencies.compilePlanUseCase,
    })
  );
  app.post(RUNTIME_ROUTE_PATH.plansImport, { config: { rateLimit } }, async (request, reply) =>
    importPlanRoute(request as never, reply, {
      authenticator: protectedModule.authenticator,
      authorizer: protectedModule.authorizer,
      useCase: dependencies.importPlanUseCase,
    })
  );
}
