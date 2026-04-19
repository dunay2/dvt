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
import { createPlanRouteHandler } from './executePlanRouteFacade.js';

type CompilePlanRouteDeps = CompilePlanRouteRequestResolverDeps & {
  readonly useCase: Pick<CompileExternalPlanUseCase, 'execute'>;
};

export const compilePlanRoute = createPlanRouteHandler({
  logMessage: 'plan compile failed',
  resolveRequest: resolveCompilePlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: CompilePlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command, resolvedRequest.context),
  mapResult: (result) => mapCompilePlanUseCaseResult(result),
  mapInternalError: () => mapCompilePlanInternalError(),
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: CompilePlanRouteDeps
) => Promise<void>;
