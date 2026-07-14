/**
 * Owned concern: register the protected workspace graph draft route group.
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';
import type { Env } from '../../plugins/env.js';

import type { ProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { registerWorkspaceGraphDraftRoutes } from './workspaceGraphDraftRoutes.js';

export type ProtectedWorkspaceGraphDraftRouteGroupOptions = {
  readonly dependencies: ProtectedRuntimeRouteDependencies;
  readonly env: Env;
  readonly observability: IObservability;
  readonly protectedModule: ProtectedRuntimeModule;
};

export function registerProtectedWorkspaceGraphDraftRouteGroup(
  app: FastifyInstance,
  options: ProtectedWorkspaceGraphDraftRouteGroupOptions
): void {
  registerWorkspaceGraphDraftRoutes(app, {
    capabilityService: options.protectedModule.workspaceGraphDraftCapabilityService,
    getUseCase: options.protectedModule.getWorkspaceGraphDraftUseCase,
    saveUseCase: options.protectedModule.saveWorkspaceGraphDraftUseCase,
    telemetry: options.dependencies.workspaceGraphDraftTelemetry,
    observability: options.observability,
    rateLimit: {
      max: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_MAX,
      timeWindow: options.env.DVT_PROTECTED_RUNTIME_RATE_LIMIT_TIME_WINDOW_MS,
    },
  });
}
