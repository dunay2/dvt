/**
 * Owned concern: classify HTTP status codes into typed error kinds for
 * consistent error rendering across the runs domain and related surfaces.
 *
 * Centralizes the HTTP-to-kind mapping used by the run workspace facade and
 * run workspace hook.
 */
import { ApiError } from './createApiClient';

/** Category of HTTP error, independent of the calling domain's message strings. */
export type HttpErrorKind =
  | 'auth-required'
  | 'access-denied'
  | 'service-unavailable'
  | 'client-error'
  | 'unclassified';

/**
 * Classifies an unknown error value into a typed {@link HttpErrorKind}.
 *
 * Usage:
 * ```ts
 * const kind = classifyHttpError(error);
 * if (kind === 'auth-required') { ... }
 * ```
 */
export function classifyHttpError(error: unknown): HttpErrorKind {
  if (error instanceof ApiError) {
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : undefined;

    if (statusCode === 401) {
      return 'auth-required';
    }
    if (statusCode === 403) {
      return 'access-denied';
    }
    if ((statusCode ?? 0) >= 500) {
      return 'service-unavailable';
    }
    return 'client-error';
  }

  return 'unclassified';
}

/**
 * Returns the numeric HTTP status code from an error if it is an {@link ApiError}.
 */
export function extractHttpStatusCode(error: unknown): number | undefined {
  return error instanceof ApiError && typeof error.statusCode === 'number'
    ? error.statusCode
    : undefined;
}
