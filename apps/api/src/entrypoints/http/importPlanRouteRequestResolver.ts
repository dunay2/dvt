import { PLAN_ROUTE_POLICY_CATALOG } from '../../application/services/planRoutePolicyCatalog.js';

import { parseImportPlanRouteInput, type ParsedImportPlanRouteInput } from './importPlanRouteParser.js';
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
  action: PLAN_ROUTE_POLICY_CATALOG.IMPORT.authorization,
});

export type ResolvedImportPlanRouteRequest = Awaited<
  ReturnType<typeof resolveImportPlanRouteRequest>
>;
