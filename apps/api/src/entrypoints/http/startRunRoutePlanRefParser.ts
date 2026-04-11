import { parsePlanRef, type PlanRef } from '@dvt/contracts';

import type { StartRunPlanRef } from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asCanonicalNonEmptyStringOrUndefined } from './startRunRouteBodyValidation.js';

export function parseStartRunPlanRef(raw: unknown): RouteParseResult<StartRunPlanRef> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanRef, { target: 'planRef' });
  }

  const record = raw as Record<string, unknown>;
  const normalized = {
    uri: asCanonicalNonEmptyStringOrUndefined(record.uri),
    sha256: asCanonicalNonEmptyStringOrUndefined(record.sha256),
    schemaVersion: asCanonicalNonEmptyStringOrUndefined(record.schemaVersion),
    planId: asCanonicalNonEmptyStringOrUndefined(record.planId),
    planVersion: asCanonicalNonEmptyStringOrUndefined(record.planVersion),
    ...(typeof record.sizeBytes === 'number' ? { sizeBytes: record.sizeBytes } : {}),
    ...(asCanonicalNonEmptyStringOrUndefined(record.expiresAt) === undefined
      ? {}
      : { expiresAt: asCanonicalNonEmptyStringOrUndefined(record.expiresAt) }),
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
