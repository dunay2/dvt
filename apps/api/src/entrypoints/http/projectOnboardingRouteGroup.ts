/**
 * Owned concern: register authenticated project onboarding HTTP routes.
 */
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import { registerProjectOnboardingRoutes } from './projectOnboardingRoutes.js';

export function registerProjectOnboardingRouteGroup(
  app: FastifyInstance,
  env: Env,
  protectedModule: ProtectedRuntimeModule
): void {
  registerProjectOnboardingRoutes(app, {
    authenticator: protectedModule.authenticator,
    listProjectsUseCase: protectedModule.listProjectsUseCase,
    createProjectUseCase: protectedModule.createProjectUseCase,
    rateLimit: {
      max: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
