import {
  type PlanPreviewProvenance,
  parsePlanPreviewProvenance,
} from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export type PreviewProvenance = PlanPreviewProvenance;

export function parsePreviewProvenance(
  raw: unknown
): RouteParseResult<PreviewProvenance | undefined> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  try {
    return {
      ok: true,
      value: parsePlanPreviewProvenance(raw),
    };
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }
}
