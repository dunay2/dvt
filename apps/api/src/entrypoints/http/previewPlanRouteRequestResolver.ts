import { PLAN_ROUTE_POLICY_CATALOG } from '../../application/services/planRoutePolicyCatalog.js';

import { mapPreviewPlanContractIssue } from './planPreviewContractErrorMapper.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';
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
      : mapPreviewPlanContractIssue(previewContractViolation);
  },
});

export type ResolvedPreviewPlanRouteRequest = Awaited<
  ReturnType<typeof resolvePreviewPlanRouteRequest>
>;
