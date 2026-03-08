import type { BackoffCalculationInput, IBackoffCalculator } from '../contracts/IBackoffCalculator.js';

export interface ExponentialBackoffConfig {
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export class ExponentialBackoffCalculator implements IBackoffCalculator {
  constructor(private readonly config: ExponentialBackoffConfig) {}

  computeNextAttempt(input: BackoffCalculationInput): Date {
    const exponent = Math.max(0, input.attemptNumber - 1);
    const delayMs = Math.min(this.config.baseDelayMs * 2 ** exponent, this.config.maxDelayMs);
    return new Date(input.now.getTime() + delayMs);
  }
}
