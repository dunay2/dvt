import type { AppendResult, EventInput, RunBootstrapInput, RunStateCommandPort } from '@dvt/engine';
import { ApplicationFailure } from '@temporalio/activity';

export type RunStateCommandCircuitState = 'closed' | 'open' | 'half_open';

export interface RunStateCommandCircuitSnapshot {
  state: RunStateCommandCircuitState;
  consecutiveFailures: number;
  openUntilEpochMs: number | null;
  tripCount: number;
  rejectionCount: number;
  failureCount: number;
  timeoutCount: number;
  halfOpenProbeCount: number;
}

export interface CircuitBreakingRunStateCommandPortOptions {
  delegate: RunStateCommandPort;
  failureThreshold: number;
  openDurationMs: number;
  operationTimeoutMs: number;
  nowEpochMs?: () => number;
}

const RETRYABLE_RUN_STATE_ERROR_TYPE = 'RetryableRunStateStoreError';
const RUN_STATE_CIRCUIT_OPEN_CODE = 'RUN_STATE_CIRCUIT_OPEN';
const RUN_STATE_STORE_UNAVAILABLE_CODE = 'RUN_STATE_STORE_UNAVAILABLE';

export class CircuitBreakingRunStateCommandPort implements RunStateCommandPort {
  private state: RunStateCommandCircuitState = 'closed';
  private consecutiveFailures = 0;
  private openUntilEpochMs: number | null = null;
  private halfOpenProbeInFlight = false;

  private tripCount = 0;
  private rejectionCount = 0;
  private failureCount = 0;
  private timeoutCount = 0;
  private halfOpenProbeCount = 0;

  public constructor(private readonly options: CircuitBreakingRunStateCommandPortOptions) {}

  public async bootstrapRun(input: RunBootstrapInput): Promise<AppendResult> {
    return this.executeGuardedOperation('bootstrapRun', () =>
      this.options.delegate.bootstrapRun(input)
    );
  }

  public async appendTransitions(runId: string, events: EventInput[]): Promise<AppendResult> {
    return this.executeGuardedOperation('appendTransitions', () =>
      this.options.delegate.appendTransitions(runId, events)
    );
  }

  public getSnapshot(): RunStateCommandCircuitSnapshot {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      openUntilEpochMs: this.openUntilEpochMs,
      tripCount: this.tripCount,
      rejectionCount: this.rejectionCount,
      failureCount: this.failureCount,
      timeoutCount: this.timeoutCount,
      halfOpenProbeCount: this.halfOpenProbeCount,
    };
  }

  private async executeGuardedOperation(
    operationName: 'bootstrapRun' | 'appendTransitions',
    run: () => Promise<AppendResult>
  ): Promise<AppendResult> {
    const nowEpochMs = this.nowEpochMs();

    if (this.state === 'open') {
      if (this.openUntilEpochMs !== null && nowEpochMs < this.openUntilEpochMs) {
        throw this.createCircuitOpenFailure(operationName);
      }

      if (this.halfOpenProbeInFlight) {
        throw this.createCircuitOpenFailure(operationName);
      }

      this.state = 'half_open';
      this.halfOpenProbeInFlight = true;
      this.halfOpenProbeCount += 1;
      try {
        const result = await this.runWithTimeout(operationName, run);
        this.resetCircuit();
        return result;
      } catch (error) {
        this.registerFailure(nowEpochMs, operationName, error);
        throw this.createRetryableStoreFailure(operationName, error);
      } finally {
        this.halfOpenProbeInFlight = false;
      }
    }

    if (this.state === 'half_open') {
      throw this.createCircuitOpenFailure(operationName);
    }

    try {
      const result = await this.runWithTimeout(operationName, run);
      this.consecutiveFailures = 0;
      return result;
    } catch (error) {
      this.registerFailure(nowEpochMs, operationName, error);
      throw this.createRetryableStoreFailure(operationName, error);
    }
  }

  private registerFailure(
    nowEpochMs: number,
    operationName: 'bootstrapRun' | 'appendTransitions',
    error: unknown
  ): void {
    this.failureCount += 1;
    if (this.isTimeoutError(operationName, error)) {
      this.timeoutCount += 1;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.tripCircuit(nowEpochMs);
    }
  }

  private tripCircuit(nowEpochMs: number): void {
    this.state = 'open';
    this.tripCount += 1;
    this.openUntilEpochMs = nowEpochMs + this.options.openDurationMs;
  }

  private resetCircuit(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.openUntilEpochMs = null;
  }

  private async runWithTimeout(
    operationName: 'bootstrapRun' | 'appendTransitions',
    run: () => Promise<AppendResult>
  ): Promise<AppendResult> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${this.options.operationTimeoutMs}ms`));
      }, this.options.operationTimeoutMs);
    });

    try {
      return await Promise.race([run(), timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private createCircuitOpenFailure(
    operationName: 'bootstrapRun' | 'appendTransitions'
  ): ApplicationFailure {
    this.rejectionCount += 1;
    return ApplicationFailure.create({
      type: RETRYABLE_RUN_STATE_ERROR_TYPE,
      message: `${RUN_STATE_CIRCUIT_OPEN_CODE}:${operationName}`,
      nonRetryable: false,
    });
  }

  private createRetryableStoreFailure(
    operationName: 'bootstrapRun' | 'appendTransitions',
    cause: unknown
  ): ApplicationFailure {
    return ApplicationFailure.create({
      type: RETRYABLE_RUN_STATE_ERROR_TYPE,
      message: `${RUN_STATE_STORE_UNAVAILABLE_CODE}:${operationName}`,
      nonRetryable: false,
      cause: toError(cause),
    });
  }

  private isTimeoutError(
    operationName: 'bootstrapRun' | 'appendTransitions',
    error: unknown
  ): boolean {
    return error instanceof Error && error.message.includes(`${operationName} timed out`);
  }

  private nowEpochMs(): number {
    return this.options.nowEpochMs?.() ?? Date.now();
  }
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === 'string' ? error : 'UnknownError');
}
