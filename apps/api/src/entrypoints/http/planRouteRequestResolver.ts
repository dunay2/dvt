import type { FastifyRequest } from 'fastify';

import type {
  AuthorizedCommandExecutionContext,
  IAuthenticator,
} from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import type { HttpResponseModel } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import type { ParsedPlanRouteScope } from './planRouteScopeParser.js';
import type { RouteParseResult } from './routeParseIssue.js';

const START_RUN_ACTION = { kind: 'command', name: 'run:start' } as const;

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

export async function resolveAuthorizedPlanRouteRequest<TParsedRequest>(
  request: FastifyRequest<{ Body: unknown }>,
  deps: PlanRouteAuthorizationResolverDeps,
  parsedRequest: RouteParseResult<TParsedRequest>,
  selectRequestedScope: (parsedRequest: TParsedRequest) => RequestedPlanRouteScope
): Promise<ResolvedAuthorizedPlanRouteRequest<TParsedRequest>> {
  if (!parsedRequest.ok) {
    return {
      ok: false,
      response: mapRouteParseIssue(parsedRequest.issue),
    };
  }

  const requestedScope = selectRequestedScope(parsedRequest.value);
  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: requestedScope.tenantId,
      projectId: requestedScope.projectId,
      environmentId: requestedScope.environmentId,
      action: START_RUN_ACTION,
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
