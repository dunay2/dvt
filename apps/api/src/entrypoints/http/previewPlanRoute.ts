/**
 * Owned concern: preview-plan HTTP route composition over the shared
 * plan-route executor and response-translation seam.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';

import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import { mapPreviewPlanContractIssue } from './planPreviewContractErrorMapper.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';
import { parsePreviewPlanBody, type ParsedPreviewPlanRequest } from './previewPlanRouteParser.js';
import {
  mapPreviewPlanInternalError,
  mapPreviewPlanUseCaseResult,
} from './previewPlanRouteResponseMapper.js';

type PreviewPlanRouteDeps = PlanRouteAuthorizationResolverDeps & {
  readonly useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

const resolvePreviewPlanRouteRequest = createAuthorizedPlanRouteRequestResolver<
  PreviewPlanRouteDeps,
  ParsedPreviewPlanRequest
>({
  parseRequestBody: parsePreviewPlanBody,
  selectRequestedScope: (parsedRequest) => parsedRequest.routeContext,
  validateAuthorizedRequest: (resolvedRequest) => {
    const previewContractViolation = validatePreviewProfileContract(
      resolvedRequest.parsedRequest.previewProfile,
      resolvedRequest.parsedRequest.contractRequest
    );
    return previewContractViolation === null
      ? null
      : mapPreviewPlanContractIssue(previewContractViolation);
  },
});

export const previewPlanRoute = createPlanRouteHandler({
  logMessage: 'plan preview failed',
  resolveRequest: resolvePreviewPlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: PreviewPlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command, resolvedRequest.context),
  mapResult: (result, resolvedRequest) =>
    mapPreviewPlanUseCaseResult(result, resolvedRequest.parsedRequest),
  mapInternalError: mapPreviewPlanInternalError,
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PreviewPlanRouteDeps
) => Promise<void>;
