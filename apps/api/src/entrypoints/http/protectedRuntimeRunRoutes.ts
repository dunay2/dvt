/**
 * Owned concern: register protected runtime run read and control HTTP routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { cancelRunRoute } from './cancelRunRoute.js';
import { getRunEventsRoute } from './getRunEventsRoute.js';
import { getRunRoute } from './getRunRoute.js';
import { listRunsRoute } from './listRunsRoute.js';
import type { ProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { recoverRunRoute } from './recoverRunRoute.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import { signalRunRoute } from './signalRunRoute.js';

export function registerProtectedRunRoutes(
  app: FastifyInstance,
  env: Env,
  _protectedModule: ProtectedRuntimeModule,
  dependencies: ProtectedRuntimeRouteDependencies
): void {
  const { runtimeAuth } = dependencies;
  const rateLimit = {
    max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
    timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
  };

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
  app.post(RUNTIME_ROUTE_PATH.signal, { config: { rateLimit } }, async (request, reply) =>
    signalRunRoute(request as never, reply, {
      ...runtimeAuth,
      useCase: dependencies.signalRunUseCase,
      compatibilityPolicy: { allowCancelSignalType: env.DVT_SIGNAL_ROUTE_ALLOW_CANCEL },
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
