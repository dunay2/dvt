/**
 * Owned concern: preview-plan request resolution, including semantic contract
 * validation before the shared plan-route executor sees an authorized request.
 */
import { PLAN_ROUTE_POLICY_CATALOG } from '../../application/services/planRoutePolicyCatalog.js';

import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';
import { planRouteResponseTranslation } from './planRouteResponseTranslation.js';
import { parsePreviewPlanBody, type ParsedPreviewPlanRequest } from './previewPlanRouteParser.js';

export interface PreviewPlanRouteRequestResolverDeps extends PlanRouteAuthorizationResolverDeps {}

export const resolvePreviewPlanRouteRequest = createAuthorizedPlanRouteRequestResolver<
  PreviewPlanRouteRequestResolverDeps,
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

export type ResolvedPreviewPlanRouteRequest = Awaited<
  ReturnType<typeof resolvePreviewPlanRouteRequest>
>;
