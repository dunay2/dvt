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
      return await this.useCase.execute(input.command, authorization.context);
    } catch (error) {
      if (error instanceof AdapterNotRegisteredError) {
        return { kind: 'adapter_not_configured', adapter: input.command.targetAdapter };
      }

      const duplicate = toDuplicateResult(error, input.command.runId);
      if (duplicate !== null) {
        return duplicate;
      }

      const rateLimited = toRateLimitedResult(error);
      if (rateLimited !== null) {
        return rateLimited;
      }

      throw error;
    }
  }
}

function toDuplicateResult(
  error: unknown,
  runId: string
): Extract<StartRunFacadeResult, { readonly kind: 'duplicate' }> | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const code = (error as Error & { code?: unknown }).code;
  if (code === 'RUN_ALREADY_EXISTS') {
    return { kind: 'duplicate', runId, accepted: true, duplicateOf: 'run' };
  }
  if (code === 'INTENT_ACTIVE_CONFLICT') {
    return { kind: 'duplicate', runId, accepted: true, duplicateOf: 'intent' };
  }
  return null;
}

function toRateLimitedResult(
  error: unknown
): Extract<StartRunFacadeResult, { readonly kind: 'rate_limited' }> | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const code = (error as Error & { code?: unknown }).code;
  if (code !== 'OUTBOX_RATE_LIMIT_EXCEEDED') {
    return null;
  }

  return {
    kind: 'rate_limited',
    accepted: false,
    code: 'OUTBOX_RATE_LIMIT_EXCEEDED',
  };
}
