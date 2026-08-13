/**
 * Owned concern: compile-plan HTTP route composition over the shared
 * plan-route executor and response-translation seam.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { CompilePlanUseCase } from '../../application/services/CompilePlanUseCase.js';

import {
  mapCompilePlanInternalError,
  mapCompilePlanUseCaseResult,
} from './compilePlanRouteResponseMapper.js';
import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import {
  parsePlanCompileRouteInput,
  type ParsedPlanCompileRouteInput,
} from './planCompileRouteInputParser.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';

type CompilePlanRouteDeps = PlanRouteAuthorizationResolverDeps & {
  readonly useCase: Pick<CompilePlanUseCase, 'execute'>;
};

const resolveCompilePlanRouteRequest = createAuthorizedPlanRouteRequestResolver<
  CompilePlanRouteDeps,
  ParsedPlanCompileRouteInput
>({
  parseRequestBody: parsePlanCompileRouteInput,
  selectRequestedScope: (parsedRequest) => parsedRequest.requestedScope,
});

export const compilePlanRoute = createPlanRouteHandler({
  logMessage: 'plan compile failed',
  resolveRequest: resolveCompilePlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: CompilePlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command, resolvedRequest.context),
  mapResult: mapCompilePlanUseCaseResult,
  mapInternalError: mapCompilePlanInternalError,
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: CompilePlanRouteDeps
) => Promise<void>;
