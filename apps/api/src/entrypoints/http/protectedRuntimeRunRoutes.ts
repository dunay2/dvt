/**
 * Owned concern: register protected runtime run read and control HTTP routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { cancelRunRoute } from './cancelRunRoute.js';
import { costAttributionSummaryRoute } from './costAttributionSummaryRoute.js';
import { getRunEventsRoute } from './getRunEventsRoute.js';
import { getRunRoute } from './getRunRoute.js';
import { listRunsRoute } from './listRunsRoute.js';
import type { ProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { recoverRunRoute } from './recoverRunRoute.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import { signalRunRoute } from './signalRunRoute.js';
import { startRunRoute } from './startRunRoute.js';

export function registerProtectedRunRoutes(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule,
  dependencies: ProtectedRuntimeRouteDependencies
): void {
  const { runtimeAuth } = dependencies;
  const rateLimit = {
    max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };

  app.post<{ Body: Parameters<typeof startRunRoute>[0]['body'] }>(
    RUNTIME_ROUTE_PATH.start,
    { config: { rateLimit } },
    async (request, reply) =>
      startRunRoute(request as never, reply, {
        adapterRegistry: protectedModule.startRunTargetAdapterRegistry,
        ...runtimeAuth,
        observability: dependencies.observability,
        telemetry: protectedModule.startRunTelemetry,
        useCase: protectedModule.startRunUseCase,
      })
  );

  app.get(RUNTIME_ROUTE_PATH.list, { config: { rateLimit } }, async (request, reply) =>
    listRunsRoute(request as never, reply, {
      ...runtimeAuth,
      useCase: dependencies.listRunsUseCase,
    })
  );
  app.get(RUNTIME_ROUTE_PATH.get, { config: { rateLimit } }, async (request, reply) =>
    getRunRoute(request as never, reply, {
      ...runtimeAuth,
      useCase: dependencies.getRunStatusUseCase,
    })
  );
  app.get(RUNTIME_ROUTE_PATH.events, { config: { rateLimit } }, async (request, reply) =>
    getRunEventsRoute(request as never, reply, {
      ...runtimeAuth,
      useCase: dependencies.getRunEventsUseCase,
    })
  );
  app.get(
    RUNTIME_ROUTE_PATH.costAttributionSummary,
    { config: { rateLimit } },
    async (request, reply) =>
      costAttributionSummaryRoute(request as never, reply, {
        ...runtimeAuth,
        useCase: dependencies.getCostAttributionSummaryUseCase,
      })
  );
  app.post(RUNTIME_ROUTE_PATH.signal, { config: { rateLimit } }, async (request, reply) =>
    signalRunRoute(request as never, reply, {
      ...runtimeAuth,
      useCase: dependencies.signalRunUseCase,
    })
  );
  app.post(RUNTIME_ROUTE_PATH.cancel, { config: { rateLimit } }, async (request, reply) =>
    cancelRunRoute(request as never, reply, {
      ...runtimeAuth,
      useCase: dependencies.cancelRunUseCase,
    })
  );
  app.post(RUNTIME_ROUTE_PATH.recover, { config: { rateLimit } }, async (request, reply) =>
    recoverRunRoute(request as never, reply, {
      ...runtimeAuth,
      useCase: dependencies.recoverRunUseCase,
    })
  );
}
