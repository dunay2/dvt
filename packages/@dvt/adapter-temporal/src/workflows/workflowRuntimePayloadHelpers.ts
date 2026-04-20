import type { MaterializationEvidence, TransformationExecutor } from '@dvt/contracts';

export function buildRunCompletedPayload(
  runtimeExecutor: TransformationExecutor | undefined,
  latestResultEvidence: MaterializationEvidence | undefined
): Record<string, unknown> | undefined {
  if (runtimeExecutor === undefined && latestResultEvidence === undefined) {
    return undefined;
  }

  return {
    ...(runtimeExecutor === undefined ? {} : { executor: runtimeExecutor }),
    ...(latestResultEvidence === undefined ? {} : { resultEvidence: latestResultEvidence }),
  };
}

export function buildRunFailedPayload(
  runtimeExecutor: TransformationExecutor | undefined,
  error: string | undefined
): Record<string, unknown> {
  return {
    reason: 'STEP_FAILURE',
    ...(runtimeExecutor === undefined ? {} : { executor: runtimeExecutor }),
    ...(error === undefined ? {} : { message: error }),
  };
}

export function toOptionalPayload(payload: Record<string, unknown> | undefined): {
  payload?: Record<string, unknown>;
} {
  return payload === undefined ? {} : { payload };
}
