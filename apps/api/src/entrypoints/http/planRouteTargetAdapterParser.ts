import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { asCanonicalNonEmptyStringOrUndefined } from './planRouteBodyParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export interface RouteTargetAdapterSupport<TAdapter extends string> {
  isSupported(value: string): value is TAdapter;
}

export function parseRouteTargetAdapter<TAdapter extends string>(
  rawTargetAdapter: unknown,
  support: RouteTargetAdapterSupport<TAdapter>
): RouteParseResult<TAdapter> {
  const normalized = asCanonicalNonEmptyStringOrUndefined(rawTargetAdapter);
  if (normalized === undefined || !support.isSupported(normalized)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidTargetAdapter, {
      target: 'targetAdapter',
    });
  }

  return {
    ok: true,
    value: normalized,
  };
}

export function parseOptionalRouteTargetAdapter<TAdapter extends string>(
  rawTargetAdapter: unknown,
  support: RouteTargetAdapterSupport<TAdapter>
): RouteParseResult<TAdapter | undefined> {
  if (rawTargetAdapter === undefined) {
    return {
      ok: true,
      value: undefined,
    };
  }

  return parseRouteTargetAdapter(rawTargetAdapter, support);
}
