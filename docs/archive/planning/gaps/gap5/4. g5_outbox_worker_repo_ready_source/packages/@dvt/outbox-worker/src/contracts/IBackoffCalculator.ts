export interface BackoffCalculationInput {
  readonly attemptNumber: number;
  readonly firstAttemptAt: Date;
  readonly now: Date;
}

export interface IBackoffCalculator {
  computeNextAttempt(input: BackoffCalculationInput): Date;
}
