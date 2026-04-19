import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';

import { executePlanRouteFacade } from './executePlanRouteFacade.js';
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

export async function previewPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PreviewPlanRouteDeps
): Promise<void> {
  await executePlanRouteFacade(request, reply, {
    logMessage: 'plan preview failed',
    resolveRequest: () => resolvePreviewPlanRouteRequest(request, deps),
    executeUseCase: (resolvedRequest) =>
      deps.useCase.execute(
        resolvedRequest.parsedRequest.command,
        resolvedRequest.context
      ),
    mapResult: (result, resolvedRequest) =>
      mapPreviewPlanUseCaseResult(result, resolvedRequest.parsedRequest),
    mapInternalError: mapPreviewPlanInternalError,
  });
}
