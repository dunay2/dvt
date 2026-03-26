import type { AuthorizationAction, RequestedScope } from '../../domain/auth/types.js';
import type { IAuthenticator } from '../ports/auth.js';
import type { StartRunCommand } from '../ports/startRunCommandContract.js';
import {
  START_RUN_ENGINE_ERROR_KIND,
  type StartRunEngineError,
} from '../ports/startRunEngineErrorContract.js';
import {
  START_RUN_FACADE_RESULT_KIND,
  type StartRunFacadeResult,
} from '../ports/startRunFacadeContract.js';
import {
  formatUnsupportedPlanVersionReason,
  START_RUN_PLAN_REJECTION_CODE,
} from '../ports/startRunResultContract.js';
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
  }): Promise<StartRunFacadeResult> {
    const authentication = await this.authenticator.authenticateBearerToken(input.token);
    if (!authentication.ok) {
      return { kind: START_RUN_FACADE_RESULT_KIND.unauthenticated, code: authentication.code };
    }

    const authorization = await this.authorizer.authorize(
      authentication.principal,
      input.requestedScope,
      input.requestId
    );
    if (!authorization.ok) {
      return { kind: START_RUN_FACADE_RESULT_KIND.unauthorized, reason: authorization.reason };
    }

    const startRun = await this.useCase.execute(input.command, authorization.context);
    if (startRun.ok) {
      return startRun.value;
    }

    return mapEngineErrorToFacade(startRun.error);
  }
}

function mapEngineErrorToFacade(error: StartRunEngineError): StartRunFacadeResult {
  switch (error.kind) {
    case START_RUN_ENGINE_ERROR_KIND.adapterNotRegistered:
      return { kind: START_RUN_FACADE_RESULT_KIND.adapterNotConfigured, adapter: error.adapter };
    case START_RUN_ENGINE_ERROR_KIND.commandInvalid:
      return {
        kind: START_RUN_FACADE_RESULT_KIND.planRejected,
        accepted: false,
        code: START_RUN_PLAN_REJECTION_CODE.rejected,
        reason: error.reason,
        cause: error.code,
      };
    case START_RUN_ENGINE_ERROR_KIND.unsupportedPlanVersion:
      return {
        kind: START_RUN_FACADE_RESULT_KIND.planRejected,
        accepted: false,
        code: START_RUN_PLAN_REJECTION_CODE.unsupportedPlanVersion,
        reason: formatUnsupportedPlanVersionReason(error.planVersion),
        supportedVersions: error.supportedVersions,
      };
  }
}
