import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import {
  IMPORT_PLAN_RESULT_KIND,
  type ImportPlanUseCase,
} from '../../application/services/ImportPlanUseCase.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { parseImportPlanRouteInput } from './importPlanRouteParser.js';
import { buildImportPlanResponse } from './planImportResponseMapper.js';

const START_RUN_ACTION = { kind: 'command', name: 'run:start' } as const;

type ImportPlanRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly useCase: Pick<ImportPlanUseCase, 'execute'>;
};

export async function importPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: ImportPlanRouteDeps
): Promise<void> {
  const importRouteInput = parseImportPlanRouteInput(request.body);
  if (!importRouteInput.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(importRouteInput.issue));
    return;
  }

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: importRouteInput.value.routeContext.tenantId,
      projectId: importRouteInput.value.routeContext.projectId,
      environmentId: importRouteInput.value.routeContext.environmentId,
      action: START_RUN_ACTION,
    },
  });
  if (!authz.ok) {
    sendHttpResponse(reply, authz.response);
    return;
  }

  try {
    const result = await deps.useCase.execute(importRouteInput.value.command);
    if (result.kind === IMPORT_PLAN_RESULT_KIND.scopeMismatch) {
      sendHttpResponse(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.forbidden,
          reason: HTTP_ERROR_REASON.tenantAccessDenied,
          details: { cause: 'plan_scope_mismatch' },
        })
      );
      return;
    }

    reply.code(200).send(buildImportPlanResponse(result.plan, result.planRef));
  } catch (error) {
    request.log.error({ err: error }, 'plan import failed');
    sendHttpResponse(
      reply,
      createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.internalServerError,
        reason: HTTP_ERROR_REASON.internalError,
      })
    );
  }
}
