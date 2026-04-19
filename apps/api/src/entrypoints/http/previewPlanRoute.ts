import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';

import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import {
  resolvePreviewPlanRouteRequest,
  type PreviewPlanRouteRequestResolverDeps,
} from './previewPlanRouteRequestResolver.js';
import {
  mapPreviewPlanInternalError,
  mapPreviewPlanUseCaseResult,
} from './previewPlanRouteResponseMapper.js';

type PreviewPlanRouteDeps = PreviewPlanRouteRequestResolverDeps & {
  readonly useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

export const previewPlanRoute = createPlanRouteHandler({
  logMessage: 'plan preview failed',
  resolveRequest: resolvePreviewPlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: PreviewPlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command, resolvedRequest.context),
  mapResult: (result, resolvedRequest) =>
    mapPreviewPlanUseCaseResult(result, resolvedRequest.parsedRequest),
  mapInternalError: () => mapPreviewPlanInternalError(),
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PreviewPlanRouteDeps
) => Promise<void>;
