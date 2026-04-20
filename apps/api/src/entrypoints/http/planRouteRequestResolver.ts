import type { FastifyRequest } from 'fastify';

import type {
  AuthorizedCommandExecutionContext,
  IAuthenticator,
} from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { AuthorizationAction } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import type { HttpResponseModel } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
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

type RequestedPlanRouteScope = Pick<
  ParsedPlanRouteScope,
  'tenantId' | 'projectId' | 'environmentId'
>;

type PlanRouteAuthorizationAction = Extract<AuthorizationAction, { readonly kind: 'command' }>;

export interface PlanRouteAuthorizationRequestOptions<TParsedRequest> {
  readonly selectRequestedScope: (
    parsedRequest: TParsedRequest
  ) => RequestedPlanRouteScope;
  readonly action: PlanRouteAuthorizationAction;
}

type ResolvedAuthorizedPlanRouteRequestOk<TParsedRequest> = Extract<
  ResolvedAuthorizedPlanRouteRequest<TParsedRequest>,
  { readonly ok: true }
>;

type AuthorizedPlanRouteRequestValidator<
  TDeps extends PlanRouteAuthorizationResolverDeps,
  TParsedRequest,
> = (
  resolvedRequest: ResolvedAuthorizedPlanRouteRequestOk<TParsedRequest>,
  deps: TDeps
) => HttpResponseModel | null | Promise<HttpResponseModel | null>;

export interface AuthorizedPlanRouteRequestResolverOptions<
  TDeps extends PlanRouteAuthorizationResolverDeps,
  TParsedRequest,
> extends PlanRouteAuthorizationRequestOptions<TParsedRequest> {
  readonly parseRequestBody: (body: unknown) => RouteParseResult<TParsedRequest>;
  readonly validateAuthorizedRequest?: AuthorizedPlanRouteRequestValidator<
    TDeps,
    TParsedRequest
  >;
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
      response: mapRouteParseIssue(parsedRequest.issue),
    };
  }

  const requestedScope = options.selectRequestedScope(parsedRequest.value);
  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: requestedScope.tenantId,
      projectId: requestedScope.projectId,
      environmentId: requestedScope.environmentId,
      action: options.action,
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
  options: AuthorizedPlanRouteRequestResolverOptions<TDeps, TParsedRequest>
): (
  request: FastifyRequest<{ Body: unknown }>,
  deps: TDeps
) => Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>> {
  return async (
    request: FastifyRequest<{ Body: unknown }>,
    deps: TDeps
  ): Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>> => {
    const resolvedRequest = await resolveAuthorizedPlanRouteRequest(
      request,
      deps,
      options.parseRequestBody(request.body),
      {
        selectRequestedScope: options.selectRequestedScope,
        action: options.action,
      }
    );
    if (!resolvedRequest.ok) {
      return resolvedRequest;
    }

    const validationResponse = options.validateAuthorizedRequest
      ? await options.validateAuthorizedRequest(resolvedRequest, deps)
      : null;
    if (validationResponse !== null) {
      return {
        ok: false,
        response: validationResponse,
      };
    }

    return resolvedRequest;
  };
}
