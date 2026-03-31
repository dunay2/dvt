import type { StartRunPlanRef } from '../../application/ports/startRunCommandContract.js';

import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export function parseStartRunPlanRef(
  raw: unknown
): RouteParseResult<StartRunPlanRef> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return badRequestResult('invalid_plan_ref', { target: 'planRef' });
  }

  const record = raw as Record<string, unknown>;
  const uri = asNonEmptyTrimmedStringOrUndefined(record.uri);
  const sha256 = asNonEmptyTrimmedStringOrUndefined(record.sha256);
  const schemaVersion = asNonEmptyTrimmedStringOrUndefined(record.schemaVersion);
  const planId = asNonEmptyTrimmedStringOrUndefined(record.planId);
  const planVersion = asNonEmptyTrimmedStringOrUndefined(record.planVersion);

  if (uri && sha256 && schemaVersion && planId && planVersion) {
    return {
      ok: true,
      value: { uri, sha256, schemaVersion, planId, planVersion },
    };
  }

  return badRequestResult('invalid_plan_ref', { target: 'planRef' });
}
