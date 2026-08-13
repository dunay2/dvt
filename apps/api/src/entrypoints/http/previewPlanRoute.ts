/**
 * Owned concern: preview-plan HTTP route composition over the shared
 * plan-route executor and response-translation seam.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import { PLAN_ROUTE_POLICY_CATALOG } from '../../application/services/planRoutePolicyCatalog.js';
import type { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';

import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';
import { planRouteResponseTranslation } from './planRouteResponseTranslation.js';
import { parsePreviewPlanBody, type ParsedPreviewPlanRequest } from './previewPlanRouteParser.js';

type PreviewPlanRouteDeps = PlanRouteAuthorizationResolverDeps & {
  readonly useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

const resolvePreviewPlanRouteRequest = createAuthorizedPlanRouteRequestResolver<
  PreviewPlanRouteDeps,
  ParsedPreviewPlanRequest
>({
  parseRequestBody: parsePreviewPlanBody,
  selectRequestedScope: (parsedRequest) => parsedRequest.routeContext,
  action: PLAN_ROUTE_POLICY_CATALOG.PREVIEW.authorization,
  validateAuthorizedRequest: (resolvedRequest) => {
    const previewContractViolation = validatePreviewProfileContract(
      resolvedRequest.parsedRequest.previewProfile,
      resolvedRequest.parsedRequest.contractRequest
    );
    return previewContractViolation === null
      ? null
      : planRouteResponseTranslation.preview.contractIssue(previewContractViolation);
  },
});

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
