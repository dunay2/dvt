import { parseRunExecutionContextRef, type RunExecutionContextRef } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { asCanonicalNonEmptyStringOrUndefined } from './planRouteBodyParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export function parsePlanRouteRunExecutionContextRef(
  raw: unknown
): RouteParseResult<RunExecutionContextRef> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunExecutionContextRef, {
      target: 'runExecutionContextRef',
    });
  }

  const record = raw as Record<string, unknown>;
  const normalized = {
    uri: asCanonicalNonEmptyStringOrUndefined(record.uri),
    sha256: asCanonicalNonEmptyStringOrUndefined(record.sha256),
    schemaVersion: asCanonicalNonEmptyStringOrUndefined(record.schemaVersion),
    planId: asCanonicalNonEmptyStringOrUndefined(record.planId),
    planVersion: asCanonicalNonEmptyStringOrUndefined(record.planVersion),
    ...(Object.prototype.hasOwnProperty.call(record, 'pluginCompatibilityFingerprint')
      ? {
          pluginCompatibilityFingerprint: record.pluginCompatibilityFingerprint,
        }
      : {}),
  };

  try {
    return {
      ok: true,
      value: parseRunExecutionContextRef(normalized),
    };
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunExecutionContextRef, {
      target: 'runExecutionContextRef',
    });
  }
}
