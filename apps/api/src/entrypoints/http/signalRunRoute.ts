import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { ISignalRunUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { executeAuthorizedRunCommandRoute } from './runCommandRouteExecutor.js';
import {
  parseSignalRunRequest,
  type SignalRouteCompatibilityPolicy,
} from './signalRunRouteParser.js';

export async function signalRunRoute(
  request: FastifyRequest<{ Params: { runId?: string }; Body: unknown }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: ISignalRunUseCase;
    compatibilityPolicy: SignalRouteCompatibilityPolicy;
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
    parseSignalRunRequest({
      runId: request.params.runId,
      body: request.body,
      compatibilityPolicy: deps.compatibilityPolicy,
    })
  );
}
