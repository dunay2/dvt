import { AdapterNotRegisteredError } from '@dvt/engine';

import type { AuthorizationAction, RequestedScope } from '../../domain/auth/types.js';
import type {
  IAuthenticator,
  IStartRunUseCase,
  StartRunCommand,
  StartRunFacadeResult,
} from '../ports/auth.js';

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
  }): Promise<StartRunFacadeResult> {
    const authentication = await this.authenticator.authenticateBearerToken(input.token);
    if (!authentication.ok) {
      return { kind: 'unauthenticated', code: authentication.code };
    }

    const authorization = await this.authorizer.authorize(
      authentication.principal,
      input.requestedScope,
      input.requestId
    );
    if (!authorization.ok) {
      return { kind: 'unauthorized', reason: authorization.reason };
    }

    try {
      const result = await this.useCase.execute(input.command, authorization.context);
      return { kind: 'accepted', result };
    } catch (error) {
      if (error instanceof AdapterNotRegisteredError) {
        return { kind: 'adapter_not_configured', adapter: input.command.targetAdapter };
      }

      throw error;
    }
  }
}
