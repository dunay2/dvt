import type { FastifyRequest } from 'fastify';

import {
  parsePlanCompileRouteInput,
  type ParsedPlanCompileRouteInput,
} from './planCompileRouteInputParser.js';
import {
  resolveAuthorizedPlanRouteRequest,
  type PlanRouteAuthorizationResolverDeps,
  type ResolvedAuthorizedPlanRouteRequest,
} from './planRouteRequestResolver.js';

export type ResolvedCompilePlanRouteRequest =
  ResolvedAuthorizedPlanRouteRequest<ParsedPlanCompileRouteInput>;

export interface CompilePlanRouteRequestResolverDeps
  extends PlanRouteAuthorizationResolverDeps {}

export function resolveCompilePlanRouteRequest(
  request: FastifyRequest<{ Body: unknown }>,
  deps: CompilePlanRouteRequestResolverDeps
): Promise<ResolvedCompilePlanRouteRequest> {
  return resolveAuthorizedPlanRouteRequest(
    request,
    deps,
    parsePlanCompileRouteInput(request.body),
    (parsedRequest) => parsedRequest.requestedScope
  );
}
