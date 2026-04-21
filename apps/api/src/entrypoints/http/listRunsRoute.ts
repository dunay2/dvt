import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IListRunsUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { parseListRunsRequest } from './listRunsRouteParser.js';

export async function listRunsRoute(
  request: FastifyRequest<{
    Querystring: {
      tenantId?: string;
      projectId?: string;
      environmentId?: string;
      limit?: string;
      cursor?: string;
    };
  }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: IListRunsUseCase;
  }
): Promise<void> {
  const parsed = parseListRunsRequest({
    tenantId: request.query.tenantId,
    projectId: request.query.projectId,
    environmentId: request.query.environmentId,
    limit: request.query.limit,
    cursor: request.query.cursor,
  });
  if (!parsed.ok) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
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
    httpErrorTranslation.respond(reply, auth.response);
    return;
  }

  try {
    const result = await deps.useCase.execute(parsed.value.query, auth.context);
    reply.code(200).send(result);
  } catch (error) {
    const mapped = httpErrorTranslation.runtime.domainError(error);
    if (mapped) {
      httpErrorTranslation.respond(reply, mapped);
      return;
    }

    throw error;
  }
}
