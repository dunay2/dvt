import type { AuthorizationAction, RequestedScope } from '../../domain/auth/types.js';
import type { IAuthenticator } from '../ports/auth.js';
import type { StartRunCommand } from '../ports/startRunCommandContract.js';
import {
  START_RUN_FACADE_RESULT_KIND,
  type StartRunFacadeExecutionResult,
} from '../ports/startRunFacadeContract.js';
import type { IStartRunUseCase } from '../ports/startRunUseCaseContract.js';

import { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';

export class StartRunAuthorizedFacade {
  public constructor(
    private readonly authenticator: IAuthenticator,
    private readonly authorizer: AuthorizeCommandScopeService,
    private readonly useCase: IStartRunUseCase
  ) {}

  public async execute(input: {
    token: string | undefined;
    requestId: string;
    command: StartRunCommand;
    requestedScope: RequestedScope & {
      readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
    };
  }): Promise<StartRunFacadeExecutionResult> {
    const authentication = await this.authenticator.authenticateBearerToken(input.token);
    if (!authentication.ok) {
      return {
        ok: true,
        value: { kind: START_RUN_FACADE_RESULT_KIND.unauthenticated, code: authentication.code },
      };
    }

    const authorization = await this.authorizer.authorize(
      authentication.principal,
      input.requestedScope,
      input.requestId
    );
    if (!authorization.ok) {
      return {
        ok: true,
        value: { kind: START_RUN_FACADE_RESULT_KIND.unauthorized, reason: authorization.reason },
      };
    }

    return this.useCase.execute(input.command, authorization.context);
  }
}
