import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IGetRunStatusUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { parseGetRunRequest } from './getRunRouteParser.js';
import { mapRuntimeDomainError } from './httpDomainErrorClassifier.js';
import { sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';

export async function getRunRoute(
  request: FastifyRequest<{
    Params: { runId?: string };
    Querystring: { tenantId?: string; enriched?: string };
  }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: IGetRunStatusUseCase;
  }
): Promise<void> {
  const parsed = parseGetRunRequest({
    runId: request.params.runId,
    tenantId: request.query.tenantId,
    enriched: request.query.enriched,
  });
  if (!parsed.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(parsed.issue));
    return;
  }

  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: parsed.value.requestedScope,
  });
  if (!auth.ok) {
    sendHttpResponse(reply, auth.response);
    return;
  }

  try {
    const result = await deps.useCase.execute(parsed.value.useCaseInput, auth.context);
    reply.code(200).send(result);
  } catch (error) {
    const mapped = mapRuntimeDomainError(error);
    if (mapped) {
      sendHttpResponse(reply, mapped);
      return;
    }

    throw error;
  }
}
