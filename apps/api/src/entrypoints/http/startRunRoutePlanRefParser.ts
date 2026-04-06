import type { StartRunPlanRef } from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';

export function parseStartRunPlanRef(raw: unknown): RouteParseResult<StartRunPlanRef> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanRef, { target: 'planRef' });
  }

  const record = raw as Record<string, unknown>;
  const uri = asNonEmptyTrimmedStringOrUndefined(record.uri);
  const sha256 = asNonEmptyTrimmedStringOrUndefined(record.sha256);
  const schemaVersion = asNonEmptyTrimmedStringOrUndefined(record.schemaVersion);
  const planId = asNonEmptyTrimmedStringOrUndefined(record.planId);
  const planVersion = asNonEmptyTrimmedStringOrUndefined(record.planVersion);
  const pluginCompatibilityFingerprint = asNonEmptyTrimmedStringOrUndefined(
    record.pluginCompatibilityFingerprint
  );

  if (uri && sha256 && schemaVersion && planId && planVersion) {
    return {
      ok: true,
      value: {
        uri,
        sha256,
        schemaVersion,
        planId,
        planVersion,
        ...(pluginCompatibilityFingerprint === undefined ? {} : { pluginCompatibilityFingerprint }),
      },
    };
  }

  return badRequestResult(HTTP_ERROR_REASON.invalidPlanRef, { target: 'planRef' });
}
