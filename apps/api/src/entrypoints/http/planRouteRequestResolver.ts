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
import type { ParsedPlanRouteScope } from './planRouteScopeParser.js';
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

export interface PlanRouteAuthorizationRequestOptions<TParsedRequest> {
  readonly selectRequestedScope: (parsedRequest: TParsedRequest) => ParsedPlanRouteScope;
}

export interface AuthorizedPlanRouteRequestResolverOptions<
  TParsedRequest,
> extends PlanRouteAuthorizationRequestOptions<TParsedRequest> {
  readonly parseRequestBody: (body: unknown) => RouteParseResult<TParsedRequest>;
}

export async function resolveAuthorizedPlanRouteRequest<TParsedRequest>(
  request: FastifyRequest<{ Body: unknown }>,
  deps: PlanRouteAuthorizationResolverDeps,
  parsedRequest: RouteParseResult<TParsedRequest>,
  options: PlanRouteAuthorizationRequestOptions<TParsedRequest>
): Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>> {
  if (!parsedRequest.ok) {
    return {
      ok: false,
      response: httpErrorTranslation.parse.issue(parsedRequest.issue),
    };
  }

  const requestedScope = options.selectRequestedScope(parsedRequest.value);
  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      ...buildEnvironmentAccessScope(
        requestedScope.tenantId,
        requestedScope.projectId,
        requestedScope.environmentId
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
    return resolveAuthorizedPlanRouteRequest(
      request,
      deps,
      options.parseRequestBody(request.body),
      {
        selectRequestedScope: options.selectRequestedScope,
      }
    );
  };
}
