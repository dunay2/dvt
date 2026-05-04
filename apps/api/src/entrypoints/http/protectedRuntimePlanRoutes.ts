/**
 * Owned concern: register protected runtime session and plan HTTP routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { compilePlanRoute } from './compilePlanRoute.js';
import { importPlanRoute } from './importPlanRoute.js';
import { previewPlanRoute } from './previewPlanRoute.js';
import type { ProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import { sessionRoute } from './sessionRoute.js';
import { startRunRoute } from './startRunRoute.js';

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

  app.get(RUNTIME_ROUTE_PATH.session, { config: { rateLimit } }, async (request, reply) =>
    sessionRoute(request as never, reply as never, {
      authenticator: protectedModule.authenticator,
    })
  );
  app.post<{ Body: Parameters<typeof startRunRoute>[0]['body'] }>(
    RUNTIME_ROUTE_PATH.start,
    { config: { rateLimit } },
    async (request, reply) =>
      startRunRoute(request as never, reply, protectedModule.facade, {
        adapterRegistry: protectedModule.startRunTargetAdapterRegistry,
      })
  );
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
