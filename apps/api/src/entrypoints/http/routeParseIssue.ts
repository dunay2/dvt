import {
  HTTP_ERROR_TYPE,
  normalizeHttpErrorReason,
  type HttpErrorType,
} from './httpErrorContract.js';

type RouteParseErrorType = typeof HTTP_ERROR_TYPE.badRequest | typeof HTTP_ERROR_TYPE.forbidden;

export interface RouteParseIssue {
  readonly type: RouteParseErrorType;
  readonly reason: string;
  readonly target?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type RouteParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue: RouteParseIssue };

export function badRequestIssue(reason: string, options?: RouteParseIssueOptions): RouteParseIssue {
  return createRouteParseIssue(HTTP_ERROR_TYPE.badRequest, reason, options);
}

export function forbiddenIssue(reason: string, options?: RouteParseIssueOptions): RouteParseIssue {
  return createRouteParseIssue(HTTP_ERROR_TYPE.forbidden, reason, options);
}

export function badRequestResult<T = never>(
  reason: string,
  options?: RouteParseIssueOptions
): RouteParseResult<T> {
  return { ok: false, issue: badRequestIssue(reason, options) };
}

export function forbiddenResult<T = never>(
  reason: string,
  options?: RouteParseIssueOptions
): RouteParseResult<T> {
  return { ok: false, issue: forbiddenIssue(reason, options) };
}

type RouteParseIssueOptions = {
  readonly target?: string;
  readonly details?: Readonly<Record<string, unknown>>;
};

function createRouteParseIssue(
  type: Extract<HttpErrorType, RouteParseErrorType>,
  reason: string,
  options?: RouteParseIssueOptions
): RouteParseIssue {
  return {
    type,
    reason: normalizeHttpErrorReason(reason),
    ...(options?.target === undefined ? {} : { target: options.target }),
    ...(options?.details === undefined ? {} : { details: options.details }),
  };
}
