import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ImportPlanUseCase } from '../../application/services/ImportPlanUseCase.js';

import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import {
  resolveImportPlanRouteRequest,
  type ImportPlanRouteRequestResolverDeps,
} from './importPlanRouteRequestResolver.js';
import {
  mapImportPlanInternalError,
  mapImportPlanUseCaseResult,
} from './importPlanRouteResponseMapper.js';

type ImportPlanRouteDeps = ImportPlanRouteRequestResolverDeps & {
  readonly useCase: Pick<ImportPlanUseCase, 'execute'>;
};

export const importPlanRoute = createPlanRouteHandler({
  logMessage: 'plan import failed',
  resolveRequest: resolveImportPlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: ImportPlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command),
  mapResult: (result) => mapImportPlanUseCaseResult(result),
  mapInternalError: () => mapImportPlanInternalError(),
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: ImportPlanRouteDeps
) => Promise<void>;
