import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { ISignalRunUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { parseCancelRunRequest } from './cancelRunRouteParser.js';
import { executeAuthorizedRunCommandRoute } from './runCommandRouteExecutor.js';

export async function cancelRunRoute(
  request: FastifyRequest<{ Params: { runId?: string }; Body: unknown }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: ISignalRunUseCase;
  }
): Promise<void> {
  await executeAuthorizedRunCommandRoute(
    request,
    reply,
    {
      authenticator: deps.authenticator,
      authorizer: deps.authorizer,
      execute: (command, context) => deps.useCase.execute(command, context),
    },
    parseCancelRunRequest({
      runId: request.params.runId,
      body: request.body,
    })
  );
}
