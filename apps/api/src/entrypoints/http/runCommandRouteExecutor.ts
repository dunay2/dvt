import type { FastifyReply, FastifyRequest } from 'fastify';

import type {
  AuthorizedCommandExecutionContext,
  IAuthenticator,
} from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { TenantId } from '../../domain/auth/types.js';

import { mapRuntimeDomainError } from './authErrorMapper.js';
import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import type { ParsedRunCommandError } from './runCommandFieldParsers.js';
import type { RunCommandActionName } from './runCommandRoute.constants.js';

type ParsedCommandRequest<TCommand> = {
  readonly command: TCommand;
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: RunCommandActionName;
  };
};

type ParsedCommandResult<TCommand, TParseCode extends string = string> =
  | { readonly ok: true; readonly value: ParsedCommandRequest<TCommand> }
  | ParsedRunCommandError<TParseCode>;

export async function executeAuthorizedRunCommandRoute<
  TCommand,
  TResult,
  TParseCode extends string = string,
>(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    execute: (command: TCommand, context: AuthorizedCommandExecutionContext) => Promise<TResult>;
  },
  parsed: ParsedCommandResult<TCommand, TParseCode>
): Promise<void> {
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
    const result = await deps.execute(parsed.value.command, auth.context);
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
