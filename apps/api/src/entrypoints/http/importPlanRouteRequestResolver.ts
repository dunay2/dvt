import { parseImportPlanRouteInput, type ParsedImportPlanRouteInput } from './importPlanRouteParser.js';
import { PLAN_ROUTE_AUTHORIZATION } from './planRouteAuthorization.constants.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';

export interface ImportPlanRouteRequestResolverDeps
  extends PlanRouteAuthorizationResolverDeps {}

export const resolveImportPlanRouteRequest = createAuthorizedPlanRouteRequestResolver<
  ImportPlanRouteRequestResolverDeps,
  ParsedImportPlanRouteInput
>({
  parseRequestBody: parseImportPlanRouteInput,
  selectRequestedScope: (parsedRequest) => parsedRequest.routeContext,
  action: PLAN_ROUTE_AUTHORIZATION.IMPORT,
});

export type ResolvedImportPlanRouteRequest = Awaited<
  ReturnType<typeof resolveImportPlanRouteRequest>
>;
