/**
 * Owned concern: translate canonical start-run command data and engine-facing
 * failures across the application-to-engine execution seam.
 */
import {
  asNonBlankString,
  parsePlanRef,
  START_RUN_DUPLICATE_OF,
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RATE_LIMIT_CODE,
  START_RUN_RESULT_KIND,
  type StartRunResult,
  type StartRunAcceptedResult,
  type StartRunCommand,
  type StartRunPlanRef,
} from '@dvt/contracts';
import {
  AdapterNotRegisteredError,
  OutboxRateLimitExceededError,
  RunExecutionContextRejectedError,
  RunAlreadyExistsError,
  UnsupportedPlanVersionError,
  type PlanRef,
  type RunContext,
} from '@dvt/engine';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_KIND,
  START_RUN_ENGINE_ERROR_REASON,
  type StartRunEngineError,
} from '../ports/startRunEngineError.js';
import type { StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';

export function validateStartRunPlanRef(
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

export function toAcceptedStartRunResult(runId: string): StartRunAcceptedResult {
  return {
    kind: START_RUN_RESULT_KIND.accepted,
    runId,
    accepted: true,
  };
}

export function mapEngineStartRunError(
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

export function toEnginePlanRef(planRef: StartRunPlanRef): PlanRef {
  const parsedPlanRef = parsePlanRef({
    uri: asNonBlankString(planRef.uri),
    sha256: asNonBlankString(planRef.sha256),
    schemaVersion: asNonBlankString(planRef.schemaVersion),
    planId: asNonBlankString(planRef.planId),
    planVersion: asNonBlankString(planRef.planVersion),
    ...(planRef.sizeBytes === undefined ? {} : { sizeBytes: planRef.sizeBytes }),
    ...(planRef.expiresAt === undefined ? {} : { expiresAt: planRef.expiresAt }),
  });

  return {
    uri: parsedPlanRef.uri,
    sha256: parsedPlanRef.sha256,
    schemaVersion: parsedPlanRef.schemaVersion,
    planId: parsedPlanRef.planId,
    planVersion: parsedPlanRef.planVersion,
    ...(parsedPlanRef.sizeBytes === undefined ? {} : { sizeBytes: parsedPlanRef.sizeBytes }),
    ...(parsedPlanRef.expiresAt === undefined ? {} : { expiresAt: parsedPlanRef.expiresAt }),
  };
}

export function toEngineRunContext(
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

function getErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const code = (error as Error & { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function ok(value: StartRunResult): StartRunUseCaseResult {
  return { ok: true, value };
}

function fail(error: StartRunEngineError): StartRunUseCaseResult {
  return { ok: false, error };
}
