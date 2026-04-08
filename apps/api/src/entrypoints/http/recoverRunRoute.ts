import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IRecoverRunUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { parseRecoverRunRequest } from './recoverRunRouteParser.js';
import { executeAuthorizedRunCommandRoute } from './runCommandRouteExecutor.js';

export async function recoverRunRoute(
  request: FastifyRequest<{ Params: { runId?: string }; Body: unknown }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: IRecoverRunUseCase;
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
    parseRecoverRunRequest({
      sourceRunId: request.params.runId,
      body: request.body,
    })
  );
}
