import {
  AdapterNotRegisteredError,
  OutboxRateLimitExceededError,
  RunExecutionContextRejectedError,
  RunAlreadyExistsError,
  UnsupportedPlanVersionError,
  type PlanRef,
  type RunContext,
  type IWorkflowEngine,
} from '@dvt/engine';
import { asNonBlankString } from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { StartRunCommand, StartRunPlanRef } from '../ports/startRunCommandContract.js';
import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_KIND,
  START_RUN_ENGINE_ERROR_REASON,
  type StartRunEngineError,
} from '../ports/startRunEngineErrorContract.js';
import {
  START_RUN_DUPLICATE_OF,
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RATE_LIMIT_CODE,
  START_RUN_RESULT_KIND,
  type StartRunResult,
} from '../ports/startRunResultContract.js';
import type { IStartRunUseCase, StartRunUseCaseResult } from '../ports/startRunUseCaseContract.js';

/**
 * Engine-backed StartRun use case.
 *
 * Bridges the application-layer command model to `IWorkflowEngine.startRun()`.
 * Authorization has already been enforced by `AuthorizeCommandScopeService`
 * before this use case is invoked; the engine's IAuthorizer is wired separately
 * as a redundant tenantId check at the engine boundary.
 */
export class EngineStartRunUseCase implements IStartRunUseCase {
  constructor(private readonly engine: IWorkflowEngine) {}

  public async execute(
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    const planRef = validateAndExtractPlanRef(command);
    if (!planRef.ok) return fail(planRef.error);

    try {
      return await this.startRunInEngine(planRef.value, command, context);
    } catch (error) {
      const mapped = mapEngineStartRunError(error, command);
      if (mapped !== null) {
        return mapped;
      }

      throw error;
    }
  }

  private async startRunInEngine(
    planRef: StartRunPlanRef,
    command: StartRunCommand,
    context: AuthorizedCommandExecutionContext
  ): Promise<StartRunUseCaseResult> {
    const ref = await this.engine.startRun(
      toEnginePlanRef(planRef),
      toEngineRunContext(command, context)
    );
    return ok({
      kind: START_RUN_RESULT_KIND.accepted,
      runId: ref.runId,
      accepted: true,
    });
  }
}

function getErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const code = (error as Error & { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function mapEngineStartRunError(
  error: unknown,
  command: Pick<StartRunCommand, 'runId' | 'targetAdapter'>
): StartRunUseCaseResult | null {
  if (error instanceof AdapterNotRegisteredError) {
    return fail({
      kind: START_RUN_ENGINE_ERROR_KIND.adapterNotRegistered,
      adapter: command.targetAdapter,
    });
  }

  if (error instanceof UnsupportedPlanVersionError) {
    return fail({
      kind: START_RUN_ENGINE_ERROR_KIND.unsupportedPlanVersion,
      planVersion: error.planVersion,
      supportedVersions: error.supportedVersions,
    });
  }

  if (
    error instanceof RunAlreadyExistsError ||
    getErrorCode(error) === START_RUN_ENGINE_ERROR_CODE.intentActiveConflict
  ) {
    return ok({
      kind: START_RUN_RESULT_KIND.duplicate,
      runId: command.runId,
      accepted: true,
      duplicateOf:
        error instanceof RunAlreadyExistsError
          ? START_RUN_DUPLICATE_OF.run
          : START_RUN_DUPLICATE_OF.intent,
    });
  }

  if (error instanceof OutboxRateLimitExceededError) {
    return ok({
      kind: START_RUN_RESULT_KIND.rateLimited,
      accepted: false,
      code: START_RUN_RATE_LIMIT_CODE.outboxExceeded,
    });
  }

  if (error instanceof RunExecutionContextRejectedError) {
    return ok({
      kind: START_RUN_RESULT_KIND.planRejected,
      accepted: false,
      code: START_RUN_PLAN_REJECTION_CODE.rejected,
      reason: error.message,
      cause: 'run_execution_context',
    });
  }

  return null;
}

function validateAndExtractPlanRef(
  command: StartRunCommand
):
  | { readonly ok: true; readonly value: StartRunPlanRef }
  | { readonly ok: false; readonly error: StartRunEngineError } {
  if (command.planRef === undefined) {
    return {
      ok: false,
      error: {
        kind: START_RUN_ENGINE_ERROR_KIND.commandInvalid,
        code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
        reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      },
    };
  }

  return { ok: true, value: command.planRef };
}

function toEnginePlanRef(planRef: StartRunPlanRef): PlanRef {
  return {
    uri: asNonBlankString(planRef.uri),
    sha256: asNonBlankString(planRef.sha256),
    schemaVersion: asNonBlankString(planRef.schemaVersion),
    planId: asNonBlankString(planRef.planId),
    planVersion: asNonBlankString(planRef.planVersion),
  };
}

function toEngineRunContext(
  command: Pick<StartRunCommand, 'runId' | 'targetAdapter' | 'runExecutionContextRef'>,
  context: AuthorizedCommandExecutionContext
): RunContext {
  const runContext: RunContext = {
    tenantId: asNonBlankString(context.scope.tenantId.value),
    projectId: asNonBlankString(context.scope.projectId?.value ?? ''),
    environmentId: asNonBlankString(context.scope.environmentId?.value ?? ''),
    runId: asNonBlankString(command.runId),
    targetAdapter: command.targetAdapter,
  };
  if (command.runExecutionContextRef !== undefined) {
    runContext.runExecutionContextRef = command.runExecutionContextRef;
  }
  return runContext;
}

function ok(value: StartRunResult): StartRunUseCaseResult {
  return { ok: true, value };
}

function fail(error: StartRunEngineError): StartRunUseCaseResult {
  return { ok: false, error };
}
