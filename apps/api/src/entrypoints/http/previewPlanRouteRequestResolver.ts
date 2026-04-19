import type { FastifyRequest } from 'fastify';

import { type HttpResponseModel } from './httpErrorContract.js';
import { mapPreviewPlanContractIssue } from './planPreviewContractErrorMapper.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import {
  resolveAuthorizedPlanRouteRequest,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';
import { parsePreviewPlanBody, type ParsedPreviewPlanRequest } from './previewPlanRouteParser.js';

export interface PreviewPlanRouteRequestResolverDeps extends PlanRouteAuthorizationResolverDeps {}

export type ResolvedPreviewPlanRouteRequest =
  | Extract<
      Awaited<
        ReturnType<typeof resolveAuthorizedPlanRouteRequest<ParsedPreviewPlanRequest>>
      >,
      { readonly ok: true }
    >
  | {
      readonly ok: false;
      readonly response: HttpResponseModel;
    };

export async function resolvePreviewPlanRouteRequest(
  request: FastifyRequest<{ Body: unknown }>,
  deps: PreviewPlanRouteRequestResolverDeps
): Promise<ResolvedPreviewPlanRouteRequest> {
  const resolvedRequest = await resolveAuthorizedPlanRouteRequest(
    request,
    deps,
    parsePreviewPlanBody(request.body),
    (parsedRequest) => parsedRequest.routeContext
  );
  if (!resolvedRequest.ok) {
    return resolvedRequest;
  }

  const previewContractViolation = validatePreviewProfileContract(
    resolvedRequest.parsedRequest.previewProfile,
    resolvedRequest.parsedRequest.contractRequest
  );
  if (previewContractViolation !== null) {
    return {
      ok: false,
      response: mapPreviewPlanContractIssue(previewContractViolation),
    };
  }

  return {
    ok: true,
    parsedRequest: resolvedRequest.parsedRequest,
    context: resolvedRequest.context,
  };
}
