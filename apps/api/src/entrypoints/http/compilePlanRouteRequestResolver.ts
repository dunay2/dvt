import {
  parsePlanCompileRouteInput,
  type ParsedPlanCompileRouteInput,
} from './planCompileRouteInputParser.js';
import { PLAN_ROUTE_AUTHORIZATION } from './planRouteAuthorization.constants.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';

export interface CompilePlanRouteRequestResolverDeps
  extends PlanRouteAuthorizationResolverDeps {}

export const resolveCompilePlanRouteRequest = createAuthorizedPlanRouteRequestResolver<
  CompilePlanRouteRequestResolverDeps,
  ParsedPlanCompileRouteInput
>({
  parseRequestBody: parsePlanCompileRouteInput,
  selectRequestedScope: (parsedRequest) => parsedRequest.requestedScope,
  action: PLAN_ROUTE_AUTHORIZATION.COMPILE,
});

export type ResolvedCompilePlanRouteRequest = Awaited<
  ReturnType<typeof resolveCompilePlanRouteRequest>
>;
