/**
 * ADR baseline: ADR-0003-typed-errors
 */
export enum PlannerErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  GRAPH_CYCLE = 'GRAPH_CYCLE',
  UNKNOWN_RESOURCE_TYPE = 'UNKNOWN_RESOURCE_TYPE',
  INVALID_STEP_CONFIG = 'INVALID_STEP_CONFIG',
  POLICY_CONFLICT = 'POLICY_CONFLICT',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class PlannerError extends Error {
  public readonly code: PlannerErrorCode;
  public override readonly cause?: unknown;

  constructor(code: PlannerErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

/** Normalize any thrown value to PlannerError. */
export function asPlannerError(err: unknown): PlannerError {
  if (err instanceof PlannerError) return err;
  if (err instanceof Error) {
    return new PlannerError(PlannerErrorCode.INTERNAL_ERROR, err.message, err);
  }
  return new PlannerError(PlannerErrorCode.INTERNAL_ERROR, String(err), err);
}
