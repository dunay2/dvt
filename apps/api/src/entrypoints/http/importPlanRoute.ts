import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ImportPlanUseCase } from '../../application/services/ImportPlanUseCase.js';

import { executePlanRouteFacade } from './executePlanRouteFacade.js';
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

export async function importPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: ImportPlanRouteDeps
): Promise<void> {
  await executePlanRouteFacade(request, reply, {
    logMessage: 'plan import failed',
    resolveRequest: () => resolveImportPlanRouteRequest(request, deps),
    executeUseCase: (resolvedRequest) =>
      deps.useCase.execute(resolvedRequest.parsedRequest.command),
    mapResult: (result) => mapImportPlanUseCaseResult(result),
    mapInternalError: mapImportPlanInternalError,
  });
}
