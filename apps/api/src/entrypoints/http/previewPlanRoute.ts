import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import {
  PREVIEW_PLAN_RESULT_KIND,
  type PreviewPlanUseCase,
} from '../../application/services/PreviewPlanUseCase.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import { buildPreviewResponse } from './planPreviewResponseMapper.js';
import { normalizePlanRef } from './planRefHttpMapper.js';
import { parsePreviewPlanBody } from './previewPlanRouteParser.js';

const START_RUN_ACTION = { kind: 'command', name: 'run:start' } as const;

type PreviewPlanRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

export async function previewPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PreviewPlanRouteDeps
): Promise<void> {
  const parsedBody = parsePreviewPlanBody(request.body);
  if (!parsedBody.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(parsedBody.issue));
    return;
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
    sendHttpResponse(reply, authz.response);
    return;
  }

  const previewContractViolation = validatePreviewProfileContract(
    parsedBody.value.previewProfile,
    parsedBody.value.contractRequest,
    parsedBody.value.contractRequest.provenance
  );
  if (previewContractViolation !== null) {
    sendHttpResponse(reply, previewContractViolation);
    return;
  }

  try {
    const result = await deps.useCase.execute(parsedBody.value.command, authz.context);
    if (result.kind === PREVIEW_PLAN_RESULT_KIND.rejected) {
      sendHttpResponse(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.unprocessable,
          reason: HTTP_ERROR_REASON.planRejected,
          details: {
            code: result.validation.code,
            adapterId: result.validation.adapterId,
            ...(result.validation.cause === undefined ? {} : { cause: result.validation.cause }),
            rejectionReason: result.validation.reason,
          },
        })
      );
      return;
    }

    reply.code(200).send(
      buildPreviewResponse(
        result.plan,
        normalizePlanRef(result.planRef),
        parsedBody.value.contractRequest.provenance,
        parsedBody.value.previewProfile
      )
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
