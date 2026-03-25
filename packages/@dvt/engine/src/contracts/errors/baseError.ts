import type { EngineErrorCode } from './errorCodes.js';
import type { EngineErrorMessageKey, EngineErrorMessageParams } from './errorMessages.js';

export class DvtError extends Error {
  // Declared as T | undefined (not optional ?) to satisfy exactOptionalPropertyTypes.
  readonly cause: unknown = undefined;
  readonly details: Record<string, unknown> | undefined = undefined;
  readonly messageKey: EngineErrorMessageKey | undefined = undefined;
  readonly messageParams: EngineErrorMessageParams | undefined = undefined;

  constructor(
    readonly code: EngineErrorCode,
    message: string,
    readonly runId?: string,
    opts?: {
      cause?: unknown;
      details?: Record<string, unknown>;
      messageKey?: EngineErrorMessageKey;
      messageParams?: EngineErrorMessageParams;
    }
  ) {
    super(message);
    this.name = 'DvtError';
    this.cause = opts?.cause;
    this.details = opts?.details;
    this.messageKey = opts?.messageKey;
    this.messageParams = opts?.messageParams;
    // Ensure prototype chain is correct when extending built-ins in TS.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      messageKey: this.messageKey,
      messageParams: this.messageParams,
      runId: this.runId,
      cause:
        this.cause instanceof Error
          ? { name: this.cause.name, message: this.cause.message }
          : this.cause,
      details: this.details,
    } as const;
  }
}
