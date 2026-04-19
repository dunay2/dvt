import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { AuthorizedCommandExecutionContext } from '../../application/ports/authContract.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import {
  PREVIEW_PLAN_RESULT_KIND,
  type PreviewPlanUseCaseResult,
  type PreviewPlanUseCase,
} from '../../application/services/PreviewPlanUseCase.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  sendHttpResponse,
  type HttpResponseModel,
} from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { mapPreviewPlanContractIssue } from './planPreviewContractErrorMapper.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import { buildPreviewResponse } from './planPreviewResponseMapper.js';
import { normalizePlanRef } from './planRefHttpMapper.js';
import {
  parsePreviewPlanBody,
  type ParsedPreviewPlanRequest,
} from './previewPlanRouteParser.js';

const START_RUN_ACTION = { kind: 'command', name: 'run:start' } as const;

type PreviewPlanRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

type AuthorizedPreviewRequest =
  | {
      readonly ok: true;
      readonly parsedBody: ParsedPreviewPlanRequest;
      readonly context: AuthorizedCommandExecutionContext;
    }
  | {
      readonly ok: false;
      readonly response: HttpResponseModel;
    };

export async function previewPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PreviewPlanRouteDeps
): Promise<void> {
  const authorizedRequest = await authorizePreviewRequest(request, deps);
  if (!authorizedRequest.ok) {
    sendHttpResponse(reply, authorizedRequest.response);
    return;
  }

  try {
    const result = await deps.useCase.execute(
      authorizedRequest.parsedBody.command,
      authorizedRequest.context
    );
    if (result.kind === PREVIEW_PLAN_RESULT_KIND.rejected) {
      sendHttpResponse(reply, buildPreviewRejectedResponse(result));
      return;
    }

    reply
      .code(200)
      .send(
        buildPreviewAcceptedResponse(result, authorizedRequest.parsedBody)
      );
  } catch (error) {
    request.log.error({ err: error }, 'plan preview failed');
    sendHttpResponse(
      reply,
      createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.internalServerError,
        reason: HTTP_ERROR_REASON.internalError,
      })
    );
  }
}

async function authorizePreviewRequest(
  request: FastifyRequest<{ Body: unknown }>,
  deps: PreviewPlanRouteDeps
): Promise<AuthorizedPreviewRequest> {
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
    parsedBody: parsedBody.value,
    context: authz.context,
  };
}

function buildPreviewRejectedResponse(
  result: Extract<PreviewPlanUseCaseResult, { readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.rejected }>
): HttpResponseModel {
  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.unprocessable,
    reason: HTTP_ERROR_REASON.planRejected,
    details: {
      code: result.validation.code,
      adapterId: result.validation.adapterId,
      ...(result.validation.cause === undefined ? {} : { cause: result.validation.cause }),
      rejectionReason: result.validation.reason,
    },
  });
}

function buildPreviewAcceptedResponse(
  result: Extract<PreviewPlanUseCaseResult, { readonly kind: typeof PREVIEW_PLAN_RESULT_KIND.accepted }>,
  parsedBody: ParsedPreviewPlanRequest
) {
  return buildPreviewResponse(
    result.plan,
    normalizePlanRef(result.planRef),
    parsedBody.contractRequest.provenance,
    parsedBody.previewProfile
  );
}
