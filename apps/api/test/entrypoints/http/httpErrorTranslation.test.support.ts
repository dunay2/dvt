import { expect } from 'vitest';

import { httpErrorTranslation } from '../../../src/entrypoints/http/httpErrorTranslation.js';

export type CanonicalErrorResponse = {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: unknown;
};

export type CanonicalErrorExpectation = {
  readonly status: number;
  readonly type: string;
  readonly reason: string;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;
};

export function expectSystemBackpressureFacadeResult(
  result: ReturnType<typeof httpErrorTranslation.startRun.facadeResult>,
  reason: string,
  retryAfterSeconds: number
): void {
  expect(result.status).toBe(503);
  expect(result.headers).toEqual({ 'retry-after': String(retryAfterSeconds) });
  expect(result.body).toEqual({
    error: {
      type: 'service_unavailable',
      reason,
    },
  });
}

export function expectCanonicalErrorResponse(
  result: CanonicalErrorResponse,
  expectation: CanonicalErrorExpectation
): void {
  expect(result.status).toBe(expectation.status);
  expect(result.headers).toEqual(expectation.headers);
  expect(result.body).toEqual({
    error: {
      type: expectation.type,
      reason: expectation.reason,
      ...(expectation.details === undefined ? {} : { details: expectation.details }),
    },
  });
}

export function assertTranslatedRuntimeDomainError(
  result: ReturnType<typeof httpErrorTranslation.runtime.domainError>
): asserts result is Exclude<ReturnType<typeof httpErrorTranslation.runtime.domainError>, null> {
  expect(result).not.toBeNull();
}
