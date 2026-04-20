import { PLAN_ROUTE_POLICY_CATALOG } from '../../application/services/planRoutePolicyCatalog.js';

import {
  parsePlanCompileRouteInput,
  type ParsedPlanCompileRouteInput,
} from './planCompileRouteInputParser.js';
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
  action: PLAN_ROUTE_POLICY_CATALOG.COMPILE.authorization,
});

export type ResolvedCompilePlanRouteRequest = Awaited<
  ReturnType<typeof resolveCompilePlanRouteRequest>
>;
