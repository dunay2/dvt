import type { FastifyRequest } from 'fastify';

import { parseImportPlanRouteInput, type ParsedImportPlanRouteInput } from './importPlanRouteParser.js';
import {
  resolveAuthorizedPlanRouteRequest,
  type PlanRouteAuthorizationResolverDeps,
  type ResolvedAuthorizedPlanRouteRequest,
} from './planRouteRequestResolver.js';

export type ResolvedImportPlanRouteRequest =
  ResolvedAuthorizedPlanRouteRequest<ParsedImportPlanRouteInput>;

export interface ImportPlanRouteRequestResolverDeps
  extends PlanRouteAuthorizationResolverDeps {}

export function resolveImportPlanRouteRequest(
  request: FastifyRequest<{ Body: unknown }>,
  deps: ImportPlanRouteRequestResolverDeps
): Promise<ResolvedImportPlanRouteRequest> {
  return resolveAuthorizedPlanRouteRequest(
    request,
    deps,
    parseImportPlanRouteInput(request.body),
    (parsedRequest) => parsedRequest.routeContext
  );
}
