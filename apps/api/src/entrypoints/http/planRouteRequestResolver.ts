/**
 * Owned concern: resolve protected plan-route requests through shared parsing,
 * authorization.
 */
import type { FastifyRequest } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type {
  AuthorizedCommandExecutionContext,
  IAuthenticator,
} from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import type { HttpResponseModel } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { parsePlanRouteRequestedScope } from './planRouteScopeParser.js';
import type { RouteParseResult } from './routeParseIssue.js';

export interface PlanRouteAuthorizationResolverDeps {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
}

export type ResolvedAuthorizedPlanRouteRequest<TParsedRequest> =
  | {
      readonly ok: true;
      readonly parsedRequest: TParsedRequest;
      readonly context: AuthorizedCommandExecutionContext;
    }
  | {
      readonly ok: false;
      readonly response: HttpResponseModel;
    };

export interface AuthorizedPlanRouteRequestResolverOptions<TParsedRequest> {
  readonly parseRequestBody: (body: unknown) => RouteParseResult<TParsedRequest>;
}

export async function resolveAuthorizedPlanRouteRequest<TParsedRequest>(
  request: FastifyRequest<{ Body: unknown }>,
  deps: PlanRouteAuthorizationResolverDeps,
  options: AuthorizedPlanRouteRequestResolverOptions<TParsedRequest>
): Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>> {
  const requestedScope = parsePlanRouteRequestedScope(request.body);
  if (!requestedScope.ok) {
    return {
      ok: false,
      response: httpErrorTranslation.parse.issue(requestedScope.issue),
    };
  }

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      ...buildEnvironmentAccessScope(
        requestedScope.value.tenantId,
        requestedScope.value.projectId,
        requestedScope.value.environmentId
      ),
      action: AUTHORIZATION_ACTION.runStart,
    },
  });
  if (!authz.ok) {
    return {
      ok: false,
      response: authz.response,
    };
  }

  const parsedRequest = options.parseRequestBody(request.body);
  if (!parsedRequest.ok) {
    return {
      ok: false,
      response: httpErrorTranslation.parse.issue(parsedRequest.issue),
    };
  }

  return {
    ok: true,
    parsedRequest: parsedRequest.value,
    context: authz.context,
  };
}

export function createAuthorizedPlanRouteRequestResolver<
  TDeps extends PlanRouteAuthorizationResolverDeps,
  TParsedRequest,
>(
  options: AuthorizedPlanRouteRequestResolverOptions<TParsedRequest>
): (
  request: FastifyRequest<{ Body: unknown }>,
  deps: TDeps
) => Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>> {
  return async (
    request: FastifyRequest<{ Body: unknown }>,
    deps: TDeps
  ): Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>> => {
    return resolveAuthorizedPlanRouteRequest(request, deps, options);
  };
}
