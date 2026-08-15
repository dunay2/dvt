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
  'auth-required' | 'access-denied' | 'service-unavailable' | 'client-error' | 'unclassified';

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

/**
 * Returns a semantic reason from the canonical API error envelope without
 * exposing transport diagnostics to presentation code.
 */
export function extractHttpErrorReason(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined;
  }

  const responseBody = error.responseBody;
  if (responseBody === null || typeof responseBody !== 'object') {
    return undefined;
  }

  const envelopeError = (responseBody as { readonly error?: unknown }).error;
  if (envelopeError === null || typeof envelopeError !== 'object') {
    return undefined;
  }

  const reason = (envelopeError as { readonly reason?: unknown }).reason;
  return typeof reason === 'string' ? reason : undefined;
}
