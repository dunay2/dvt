import type { OutboxTickResult } from '../contracts.js';

export interface OutboxWorkerRuntimeErrorLike {
  message: string;
  name: string;
}

export function isOutboxWorkerRuntimeAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function toOutboxWorkerRuntimeErrorLike(error: unknown): OutboxWorkerRuntimeErrorLike {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  return { message: stringifyUnknownError(error), name: 'UnknownError' };
}

export function extractTickResultFromRuntimeError(error: unknown): OutboxTickResult | null {
  if (!isTickErrorWithResult(error)) {
    return null;
  }

  return error.tickResult;
}

export function unwrapOutboxWorkerRuntimeError(error: unknown): unknown {
  if (!isTickErrorWithResult(error)) {
    return error;
  }

  return error.cause;
}

function stringifyUnknownError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (isStringConvertibleScalar(error)) {
    return String(error);
  }

  if (typeof error === 'symbol') {
    return stringifySymbolError(error);
  }

  if (typeof error === 'function') {
    return stringifyFunctionError(error);
  }

  if (typeof error === 'object') {
    return stringifyObjectError(error);
  }

  return 'UnknownErrorValue';
}

function serializeErrorObject(error: object): string {
  try {
    return JSON.stringify(error);
  } catch {
    return Object.prototype.toString.call(error);
  }
}

function isStringConvertibleScalar(error: unknown): error is number | boolean | bigint | undefined {
  return (
    typeof error === 'number' ||
    typeof error === 'boolean' ||
    typeof error === 'bigint' ||
    error === undefined
  );
}

function stringifySymbolError(error: symbol): string {
  return error.description ?? error.toString();
}

function stringifyFunctionError(error: Function): string {
  return error.name ? `[function ${error.name}]` : '[function anonymous]';
}

function stringifyObjectError(error: object | null): string {
  return error === null ? 'null' : serializeErrorObject(error);
}

function isTickErrorWithResult(
  error: unknown
): error is Error & { cause: unknown; tickResult: OutboxTickResult } {
  if (!(error instanceof Error) || !('tickResult' in error)) {
    return false;
  }

  return isOutboxTickResult((error as { tickResult?: unknown }).tickResult);
}

function isOutboxTickResult(value: unknown): value is OutboxTickResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<OutboxTickResult>;
  return (
    hasNumericTickCounters(candidate) &&
    isOptionalNumber(candidate.oldestClaimedAgeMs) &&
    typeof candidate.retryBacklogActive === 'boolean'
  );
}

function hasNumericTickCounters(candidate: Partial<OutboxTickResult>): boolean {
  return (
    typeof candidate.claimedCount === 'number' &&
    typeof candidate.deliveredCount === 'number' &&
    typeof candidate.retriedCount === 'number' &&
    typeof candidate.deadLetteredCount === 'number'
  );
}

function isOptionalNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}
