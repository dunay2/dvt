import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IGetRunEventsUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { mapRuntimeDomainError } from './authErrorMapper.js';
import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { parseGetRunEventsRequest } from './getRunEventsRouteParser.js';

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
    reply.code(parsed.status).send(parsed.body);
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
    reply.code(auth.response.status).send(auth.response.body);
    return;
  }

  try {
    const result = await deps.useCase.execute(parsed.value.useCaseInput, auth.context);
    reply.code(200).send(result);
  } catch (error) {
    const mapped = mapRuntimeDomainError(error);
    if (mapped) {
      reply.code(mapped.status).send(mapped.body);
      return;
    }

    throw error;
  }
}
