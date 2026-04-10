import { parsePlanRef, type PlanRef } from '@dvt/contracts';

import type { StartRunPlanRef } from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';

export function parseStartRunPlanRef(raw: unknown): RouteParseResult<StartRunPlanRef> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanRef, { target: 'planRef' });
  }

  const record = raw as Record<string, unknown>;
  const normalized = {
    uri: asNonEmptyTrimmedStringOrUndefined(record.uri),
    sha256: asNonEmptyTrimmedStringOrUndefined(record.sha256),
    schemaVersion: asNonEmptyTrimmedStringOrUndefined(record.schemaVersion),
    planId: asNonEmptyTrimmedStringOrUndefined(record.planId),
    planVersion: asNonEmptyTrimmedStringOrUndefined(record.planVersion),
    ...(typeof record.sizeBytes === 'number' ? { sizeBytes: record.sizeBytes } : {}),
    ...(asNonEmptyTrimmedStringOrUndefined(record.expiresAt) === undefined
      ? {}
      : { expiresAt: asNonEmptyTrimmedStringOrUndefined(record.expiresAt) }),
  };

  try {
    return {
      ok: true,
      value: toRoutePlanRef(parsePlanRef(normalized)),
    };
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanRef, { target: 'planRef' });
  }
}

function toRoutePlanRef(
  planRef: Pick<PlanRef, 'uri' | 'sha256' | 'schemaVersion' | 'planId' | 'planVersion'>
): StartRunPlanRef {
  return {
    uri: planRef.uri,
    sha256: planRef.sha256,
    schemaVersion: planRef.schemaVersion,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
  };
}
