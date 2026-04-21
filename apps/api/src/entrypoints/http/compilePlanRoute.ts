/**
 * Owned concern: compile-plan HTTP route composition over the shared
 * plan-route executor and response-translation seam.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { CompilePlanUseCase } from '../../application/services/CompilePlanUseCase.js';

import {
  resolveCompilePlanRouteRequest,
  type CompilePlanRouteRequestResolverDeps,
} from './compilePlanRouteRequestResolver.js';
import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import { planRouteResponseTranslation } from './planRouteResponseTranslation.js';

type CompilePlanRouteDeps = CompilePlanRouteRequestResolverDeps & {
  readonly useCase: Pick<CompilePlanUseCase, 'execute'>;
};

export const compilePlanRoute = createPlanRouteHandler({
  logMessage: 'plan compile failed',
  resolveRequest: resolveCompilePlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: CompilePlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command, resolvedRequest.context),
  mapResult: (result) => planRouteResponseTranslation.compile.result(result),
  mapInternalError: () => planRouteResponseTranslation.compile.internalError(),
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: CompilePlanRouteDeps
) => Promise<void>;
