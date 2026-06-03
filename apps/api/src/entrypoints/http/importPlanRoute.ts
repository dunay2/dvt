/**
 * Owned concern: import-plan HTTP route composition over the shared
 * plan-route executor and response-translation seam.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ImportPlanUseCase } from '../../application/services/ImportPlanUseCase.js';

import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import {
  resolveImportPlanRouteRequest,
  type ImportPlanRouteRequestResolverDeps,
} from './importPlanRouteRequestResolver.js';
import { planRouteResponseTranslation } from './planRouteResponseTranslation.js';

type ImportPlanRouteDeps = ImportPlanRouteRequestResolverDeps & {
  readonly useCase: Pick<ImportPlanUseCase, 'execute'>;
};

export const importPlanRoute = createPlanRouteHandler({
  logMessage: 'plan import failed',
  resolveRequest: resolveImportPlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: ImportPlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command),
  mapResult: (result) => planRouteResponseTranslation.import.result(result),
  mapInternalError: () => planRouteResponseTranslation.import.internalError(),
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: ImportPlanRouteDeps
) => Promise<void>;
