import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { ISignalRunUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { mapRuntimeDomainError } from './authErrorMapper.js';
import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { parseSignalRunRequest } from './signalRunRouteParser.js';

export async function signalRunRoute(
  request: FastifyRequest<{ Params: { runId?: string }; Body: unknown }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: ISignalRunUseCase;
  }
): Promise<void> {
  const parsed = parseSignalRunRequest({
    runId: request.params.runId,
    body: request.body,
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
    requestedScope: {
      tenantId: parsed.value.authorization.tenantId,
      action: { kind: 'command', name: parsed.value.authorization.actionName },
    },
  });
  if (!auth.ok) {
    reply.code(auth.response.status).send(auth.response.body);
    return;
  }

  try {
    const result = await deps.useCase.execute(parsed.value.command, auth.context);
    reply.code(202).send(result);
  } catch (error) {
    const mapped = mapRuntimeDomainError(error);
    if (mapped) {
      reply.code(mapped.status).send(mapped.body);
      return;
    }

    throw error;
  }
}
