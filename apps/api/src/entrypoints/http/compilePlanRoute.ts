import type { IPlanner } from '@dvt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { toExternalCompilePlannerEnvelope } from './externalPlanCompilePlannerEnvelopeMapper.js';
import { parseExternalPlanCompileRouteInput } from './externalPlanCompileRouteInputParser.js';
import { extractBearerToken } from './extractBearerToken.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';

const START_RUN_ACTION = { kind: 'command', name: 'run:start' } as const;

type CompilePlanRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly planner: IPlanner;
};

export async function compilePlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: CompilePlanRouteDeps
): Promise<void> {
  const compileRouteInput = parseExternalPlanCompileRouteInput(request.body);
  if (!compileRouteInput.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(compileRouteInput.issue));
    return;
  }
  const compileInput = compileRouteInput.value;

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: compileInput.scope.tenantId,
      projectId: compileInput.scope.projectId,
      environmentId: compileInput.scope.environmentId,
      action: START_RUN_ACTION,
    },
  });
  if (!authz.ok) {
    sendHttpResponse(reply, authz.response);
    return;
  }

  try {
    const canonicalEnvelope = toExternalCompilePlannerEnvelope(compileInput, {
      requestedBy: authz.context.principal.principalId,
      requestId: request.id,
      requestedAtIso: authz.context.authorizedAt.toISOString(),
    });
    const buildResult = await deps.planner.buildPlan(canonicalEnvelope);
    reply.code(200).send({
      plan: buildResult.plan,
      compile: {
        persisted: false,
        executabilityValidated: false,
      },
    });
  } catch (error) {
    request.log.error({ err: error }, 'plan compile failed');
    sendHttpResponse(
      reply,
      createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.internalServerError,
        reason: HTTP_ERROR_REASON.internalError,
      })
    );
  }
}
