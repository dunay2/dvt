/**
 * Owned concern: register the protected workspace graph draft route group.
 */
import type { IObservability } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

import type { ProtectedRuntimeModule } from '../../modules/types.js';

import type { ProtectedRuntimeRouteDependencies } from './protectedRuntimeRouteDependencies.js';
import { registerWorkspaceGraphDraftRoutes } from './workspaceGraphDraftRoutes.js';

export function registerProtectedWorkspaceGraphDraftRouteGroup(
  app: FastifyInstance,
  observability: IObservability,
  protectedModule: ProtectedRuntimeModule,
  dependencies: ProtectedRuntimeRouteDependencies
): void {
  registerWorkspaceGraphDraftRoutes(app, {
    capabilityService: protectedModule.workspaceGraphDraftCapabilityService,
    getUseCase: protectedModule.getWorkspaceGraphDraftUseCase,
    saveUseCase: protectedModule.saveWorkspaceGraphDraftUseCase,
    telemetry: dependencies.workspaceGraphDraftTelemetry,
    observability,
  });
}
