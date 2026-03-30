import type { StartRunPlanRef } from '../../application/ports/startRunCommandContract.js';

import {
  asNonEmptyTrimmedStringOrUndefined,
  type StartRunParseResult,
} from './startRunRouteBodyValidation.js';

export function parseStartRunPlanRef(
  raw: unknown
): StartRunParseResult<StartRunPlanRef, 'INVALID_PLAN_REF'> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: 'INVALID_PLAN_REF' };
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

  return { ok: false, code: 'INVALID_PLAN_REF' };
}
