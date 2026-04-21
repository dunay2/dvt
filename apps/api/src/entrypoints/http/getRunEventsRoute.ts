import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IGetRunEventsUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { parseGetRunEventsRequest } from './getRunEventsRouteParser.js';
import { sendHttpResponse } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';

export async function getRunEventsRoute(
  request: FastifyRequest<{
    Params: { runId?: string };
    Querystring: { tenantId?: string; afterSeq?: string; limit?: string };
  }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: IGetRunEventsUseCase;
  }
): Promise<void> {
  const parsed = parseGetRunEventsRequest({
    runId: request.params.runId,
    tenantId: request.query.tenantId,
    afterSeq: request.query.afterSeq,
    limit: request.query.limit,
  });
  if (!parsed.ok) {
    sendHttpResponse(reply, httpErrorTranslation.parse.issue(parsed.issue));
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
    const mapped = httpErrorTranslation.runtime.domainError(error);
    if (mapped) {
      sendHttpResponse(reply, mapped);
      return;
    }

    throw error;
  }
}
