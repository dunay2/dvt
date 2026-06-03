import { describe, expect, it } from 'vitest';

import { classifyHttpError, extractHttpStatusCode } from './classifyHttpError';
import { ApiError } from './createApiClient';

function makeApiError(statusCode: number): ApiError {
  return new ApiError({
    message: `HTTP ${statusCode}`,
    endpoint: '/test',
    statusCode,
    category: 'client',
  });
}

describe('classifyHttpError', () => {
  it('returns auth-required for HTTP 401', () => {
    expect(classifyHttpError(makeApiError(401))).toBe('auth-required');
  });

  it('returns access-denied for HTTP 403', () => {
    expect(classifyHttpError(makeApiError(403))).toBe('access-denied');
  });

  it('returns service-unavailable for HTTP 500', () => {
    expect(classifyHttpError(makeApiError(500))).toBe('service-unavailable');
  });

  it('returns service-unavailable for HTTP 503', () => {
    expect(classifyHttpError(makeApiError(503))).toBe('service-unavailable');
  });

  it('returns client-error for HTTP 404', () => {
    expect(classifyHttpError(makeApiError(404))).toBe('client-error');
  });

  it('returns client-error for HTTP 409', () => {
    expect(classifyHttpError(makeApiError(409))).toBe('client-error');
  });

  it('returns client-error for HTTP 422', () => {
    expect(classifyHttpError(makeApiError(422))).toBe('client-error');
  });

  it('returns unclassified for non-ApiError values', () => {
    expect(classifyHttpError(new Error('Generic'))).toBe('unclassified');
    expect(classifyHttpError('string error')).toBe('unclassified');
    expect(classifyHttpError(null)).toBe('unclassified');
    expect(classifyHttpError(undefined)).toBe('unclassified');
  });
});

describe('extractHttpStatusCode', () => {
  it('returns status code from ApiError', () => {
    expect(extractHttpStatusCode(makeApiError(404))).toBe(404);
  });

  it('returns undefined for non-ApiError values', () => {
    expect(extractHttpStatusCode(new Error('Generic'))).toBeUndefined();
    expect(extractHttpStatusCode(null)).toBeUndefined();
  });
});
