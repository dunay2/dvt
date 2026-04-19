import type { FastifyReply, FastifyRequest } from 'fastify';

import type { CompileExternalPlanUseCase } from '../../application/services/CompileExternalPlanUseCase.js';

import {
  resolveCompilePlanRouteRequest,
  type CompilePlanRouteRequestResolverDeps,
} from './compilePlanRouteRequestResolver.js';
import {
  mapCompilePlanInternalError,
  mapCompilePlanUseCaseResult,
} from './compilePlanRouteResponseMapper.js';
import { executePlanRouteFacade } from './executePlanRouteFacade.js';

type CompilePlanRouteDeps = CompilePlanRouteRequestResolverDeps & {
  readonly useCase: Pick<CompileExternalPlanUseCase, 'execute'>;
};

export async function compilePlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: CompilePlanRouteDeps
): Promise<void> {
  await executePlanRouteFacade(request, reply, {
    logMessage: 'plan compile failed',
    resolveRequest: () => resolveCompilePlanRouteRequest(request, deps),
    executeUseCase: (resolvedRequest) =>
      deps.useCase.execute(
        resolvedRequest.parsedRequest.command,
        resolvedRequest.context
      ),
    mapResult: (result) => mapCompilePlanUseCaseResult(result),
    mapInternalError: mapCompilePlanInternalError,
  });
}
