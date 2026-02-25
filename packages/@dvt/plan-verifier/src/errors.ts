export type PlanVerifierErrorCode =
  | 'INVALID_PLAN_VERSION'
  | 'UNSUPPORTED_PLAN_VERSION'
  | 'PLAN_ID_MISMATCH'
  | 'MISSING_WEBCRYPTO'
  | 'MISSING_TEXT_ENCODER';

export class PlanVerifierError extends Error {
  readonly code: PlanVerifierErrorCode;

  constructor(code: PlanVerifierErrorCode, message: string) {
    super(message);
    this.name = 'PlanVerifierError';
    this.code = code;
  }
}
