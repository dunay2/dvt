import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type {
  ICancelRunUseCase,
  ISignalRunUseCase,
  SignalRunCommand,
} from '../../application/ports/runtime.js';
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
    cancelUseCase: ICancelRunUseCase;
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
      execute: (command, context) => executeCompatibilityAwareSignalCommand(command, context, deps),
    },
    parseSignalRunRequest({
      runId: request.params.runId,
      body: request.body,
      compatibilityPolicy: deps.compatibilityPolicy,
    })
  );
}

function executeCompatibilityAwareSignalCommand(
  command: SignalRunCommand,
  context: Parameters<ISignalRunUseCase['execute']>[1],
  deps: Pick<Parameters<typeof signalRunRoute>[2], 'cancelUseCase' | 'useCase'>
) {
  return command.signalType === 'CANCEL'
    ? deps.cancelUseCase.execute({ runId: command.runId, signalType: 'CANCEL' }, context)
    : deps.useCase.execute(command, context);
}
