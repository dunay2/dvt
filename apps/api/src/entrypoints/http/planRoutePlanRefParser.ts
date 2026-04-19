import type { PlanRef } from '@dvt/contracts';
import { parsePlanRef } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import {
  asCanonicalNonEmptyStringOrUndefined,
} from './planRouteBodyParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export function parsePlanRoutePlanRef(raw: unknown): RouteParseResult<PlanRef> {
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
    const parsedPlanRef = parsePlanRef(normalized);
    return {
      ok: true,
      value: {
        uri: parsedPlanRef.uri,
        sha256: parsedPlanRef.sha256,
        schemaVersion: parsedPlanRef.schemaVersion,
        planId: parsedPlanRef.planId,
        planVersion: parsedPlanRef.planVersion,
        ...(parsedPlanRef.sizeBytes === undefined ? {} : { sizeBytes: parsedPlanRef.sizeBytes }),
        ...(parsedPlanRef.expiresAt === undefined ? {} : { expiresAt: parsedPlanRef.expiresAt }),
      },
    };
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanRef, { target: 'planRef' });
  }
}
