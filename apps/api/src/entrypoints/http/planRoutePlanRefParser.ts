import type { PlanRef } from '@dvt/contracts';
import { parsePlanRef } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export function parsePlanRoutePlanRef(raw: unknown): RouteParseResult<PlanRef> {
  try {
    return {
      ok: true,
      value: parsePlanRef(raw),
    };
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanRef, { target: 'planRef' });
  }
}
