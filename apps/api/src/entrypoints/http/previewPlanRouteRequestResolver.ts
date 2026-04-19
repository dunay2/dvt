import type { FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { AuthorizedCommandExecutionContext } from '../../application/ports/authContract.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { type HttpResponseModel } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import { mapPreviewPlanContractIssue } from './planPreviewContractErrorMapper.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import { parsePreviewPlanBody, type ParsedPreviewPlanRequest } from './previewPlanRouteParser.js';

const START_RUN_ACTION = { kind: 'command', name: 'run:start' } as const;

export interface PreviewPlanRouteRequestResolverDeps {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
}

export type ResolvedPreviewPlanRouteRequest =
  | {
      readonly ok: true;
      readonly parsedRequest: ParsedPreviewPlanRequest;
      readonly context: AuthorizedCommandExecutionContext;
    }
  | {
      readonly ok: false;
      readonly response: HttpResponseModel;
    };

export async function resolvePreviewPlanRouteRequest(
  request: FastifyRequest<{ Body: unknown }>,
  deps: PreviewPlanRouteRequestResolverDeps
): Promise<ResolvedPreviewPlanRouteRequest> {
  const parsedBody = parsePreviewPlanBody(request.body);
  if (!parsedBody.ok) {
    return {
      ok: false,
      response: mapRouteParseIssue(parsedBody.issue),
    };
  }

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: parsedBody.value.routeContext.tenantId,
      projectId: parsedBody.value.routeContext.projectId,
      environmentId: parsedBody.value.routeContext.environmentId,
      action: START_RUN_ACTION,
    },
  });
  if (!authz.ok) {
    return {
      ok: false,
      response: authz.response,
    };
  }

  const previewContractViolation = validatePreviewProfileContract(
    parsedBody.value.previewProfile,
    parsedBody.value.contractRequest
  );
  if (previewContractViolation !== null) {
    return {
      ok: false,
      response: mapPreviewPlanContractIssue(previewContractViolation),
    };
  }

  return {
    ok: true,
    parsedRequest: parsedBody.value,
    context: authz.context,
  };
}
