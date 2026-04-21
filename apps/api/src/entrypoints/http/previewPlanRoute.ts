/**
 * Owned concern: preview-plan HTTP route composition over the shared
 * plan-route executor and response-translation seam.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';

import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import { planRouteResponseTranslation } from './planRouteResponseTranslation.js';
import {
  resolvePreviewPlanRouteRequest,
  type PreviewPlanRouteRequestResolverDeps,
} from './previewPlanRouteRequestResolver.js';

type PreviewPlanRouteDeps = PreviewPlanRouteRequestResolverDeps & {
  readonly useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

export const previewPlanRoute = createPlanRouteHandler({
  logMessage: 'plan preview failed',
  resolveRequest: resolvePreviewPlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: PreviewPlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command, resolvedRequest.context),
  mapResult: (result, resolvedRequest) =>
    planRouteResponseTranslation.preview.result(result, resolvedRequest.parsedRequest),
  mapInternalError: () => planRouteResponseTranslation.preview.internalError(),
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PreviewPlanRouteDeps
) => Promise<void>;
