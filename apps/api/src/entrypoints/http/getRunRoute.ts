import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IGetRunStatusUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { mapRuntimeDomainError } from './authErrorMapper.js';
import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { parseGetRunRequest } from './getRunRouteParser.js';

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
