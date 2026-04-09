import type { AuthorizationAction, RequestedScope } from '../../domain/auth/types.js';
import type { IAuthenticator } from '../ports/auth.js';
import type { StartRunCommand } from '../ports/startRunCommandContract.js';
import {
  START_RUN_FACADE_RESULT_KIND,
  type StartRunFacadeExecutionResult,
} from '../ports/startRunFacadeContract.js';
import type {
  IStartRunLatencyTelemetry,
  StartRunLatencyOutcome,
} from '../ports/StartRunSlaTelemetry.js';
import type { IStartRunUseCase } from '../ports/startRunUseCaseContract.js';

import { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';

export class StartRunAuthorizedFacade {
  private static readonly NOOP_TELEMETRY: IStartRunLatencyTelemetry = {
    recordStartRunLatency() {},
  };

  public constructor(
    private readonly authenticator: IAuthenticator,
    private readonly authorizer: AuthorizeCommandScopeService,
    private readonly useCase: IStartRunUseCase,
    private readonly telemetry: IStartRunLatencyTelemetry = StartRunAuthorizedFacade.NOOP_TELEMETRY
  ) {}

  public async execute(input: {
    token: string | undefined;
    requestId: string;
    command: StartRunCommand;
    requestedScope: RequestedScope & {
      readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
    };
  }): Promise<StartRunFacadeExecutionResult> {
    const startedAtMs = Date.now();
    let outcome: StartRunLatencyOutcome = 'exception';

    try {
      const authentication = await this.authenticator.authenticateBearerToken(input.token);
      if (!authentication.ok) {
        outcome = 'unauthenticated';
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
        outcome = 'unauthorized';
        return {
          ok: true,
          value: { kind: START_RUN_FACADE_RESULT_KIND.unauthorized, reason: authorization.reason },
        };
      }

      const result = await this.useCase.execute(input.command, authorization.context);
      outcome = mapStartRunOutcome(result);
      return result;
    } finally {
      this.telemetry.recordStartRunLatency(Date.now() - startedAtMs, outcome);
    }
  }
}

function mapStartRunOutcome(result: StartRunFacadeExecutionResult): StartRunLatencyOutcome {
  if (!result.ok) {
    return 'engine_error';
  }
  switch (result.value.kind) {
    case START_RUN_FACADE_RESULT_KIND.accepted:
    case START_RUN_FACADE_RESULT_KIND.duplicate:
    case START_RUN_FACADE_RESULT_KIND.rateLimited:
    case START_RUN_FACADE_RESULT_KIND.planRejected:
    case START_RUN_FACADE_RESULT_KIND.tenantBackpressure:
    case START_RUN_FACADE_RESULT_KIND.systemBackpressure:
      return result.value.kind;
    case START_RUN_FACADE_RESULT_KIND.unauthenticated:
      return 'unauthenticated';
    case START_RUN_FACADE_RESULT_KIND.unauthorized:
      return 'unauthorized';
  }
}
