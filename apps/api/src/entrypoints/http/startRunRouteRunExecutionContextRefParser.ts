import { parseRunExecutionContextRef, type RunExecutionContextRef } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';

export function parseStartRunRunExecutionContextRef(
  raw: unknown
): RouteParseResult<RunExecutionContextRef> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunExecutionContextRef, {
      target: 'runExecutionContextRef',
    });
  }

  const record = raw as Record<string, unknown>;
  const normalized = {
    uri: asNonEmptyTrimmedStringOrUndefined(record.uri),
    sha256: asNonEmptyTrimmedStringOrUndefined(record.sha256),
    schemaVersion: asNonEmptyTrimmedStringOrUndefined(record.schemaVersion),
    planId: asNonEmptyTrimmedStringOrUndefined(record.planId),
    planVersion: asNonEmptyTrimmedStringOrUndefined(record.planVersion),
    ...(asNonEmptyTrimmedStringOrUndefined(record.pluginCompatibilityFingerprint) === undefined
      ? {}
      : {
          pluginCompatibilityFingerprint: asNonEmptyTrimmedStringOrUndefined(
            record.pluginCompatibilityFingerprint
          ),
        }),
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
