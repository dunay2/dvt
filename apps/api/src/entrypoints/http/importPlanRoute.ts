/**
 * Owned concern: import-plan HTTP route composition over the shared
 * plan-route executor and response-translation seam.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ImportPlanUseCase } from '../../application/services/ImportPlanUseCase.js';
import { PLAN_ROUTE_POLICY_CATALOG } from '../../application/services/planRoutePolicyCatalog.js';

import { createPlanRouteHandler } from './executePlanRouteFacade.js';
import {
  parseImportPlanRouteInput,
  type ParsedImportPlanRouteInput,
} from './importPlanRouteParser.js';
import {
  mapImportPlanInternalError,
  mapImportPlanUseCaseResult,
} from './importPlanRouteResponseMapper.js';
import {
  createAuthorizedPlanRouteRequestResolver,
  type PlanRouteAuthorizationResolverDeps,
} from './planRouteRequestResolver.js';

type ImportPlanRouteDeps = PlanRouteAuthorizationResolverDeps & {
  readonly useCase: Pick<ImportPlanUseCase, 'execute'>;
};

const resolveImportPlanRouteRequest = createAuthorizedPlanRouteRequestResolver<
  ImportPlanRouteDeps,
  ParsedImportPlanRouteInput
>({
  parseRequestBody: parseImportPlanRouteInput,
  selectRequestedScope: (parsedRequest) => parsedRequest.routeContext,
  action: PLAN_ROUTE_POLICY_CATALOG.IMPORT.authorization,
});

export const importPlanRoute = createPlanRouteHandler({
  logMessage: 'plan import failed',
  resolveRequest: resolveImportPlanRouteRequest,
  executeUseCase: (resolvedRequest, deps: ImportPlanRouteDeps) =>
    deps.useCase.execute(resolvedRequest.parsedRequest.command),
  mapResult: mapImportPlanUseCaseResult,
  mapInternalError: mapImportPlanInternalError,
}) satisfies (
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: ImportPlanRouteDeps
) => Promise<void>;
