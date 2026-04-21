import type { FastifyReply, FastifyRequest } from 'fastify';

import type {
  AuthorizedCommandExecutionContext,
  IAuthenticator,
} from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { TenantId } from '../../domain/auth/types.js';
import { HTTP_STATUS_CODE } from '../../routes/httpStatus.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { sendHttpResponse } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import type { RouteParseResult } from './routeParseIssue.js';
import type { RunCommandActionName } from './runCommandRoute.constants.js';

type ParsedCommandRequest<TCommand> = {
  readonly command: TCommand;
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: RunCommandActionName;
  };
};

type ParsedCommandResult<TCommand> = RouteParseResult<ParsedCommandRequest<TCommand>>;

export async function executeAuthorizedRunCommandRoute<TCommand, TResult>(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    execute: (command: TCommand, context: AuthorizedCommandExecutionContext) => Promise<TResult>;
  },
  parsed: ParsedCommandResult<TCommand>
): Promise<void> {
  if (!parsed.ok) {
    sendHttpResponse(reply, httpErrorTranslation.parse.issue(parsed.issue));
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
    sendHttpResponse(reply, auth.response);
    return;
  }

  try {
    const result = await deps.execute(parsed.value.command, auth.context);
    reply.code(HTTP_STATUS_CODE.accepted).send(result);
  } catch (error) {
    const mapped = httpErrorTranslation.runtime.domainError(error);
    if (mapped) {
      sendHttpResponse(reply, mapped);
      return;
    }

    throw error;
  }
}
