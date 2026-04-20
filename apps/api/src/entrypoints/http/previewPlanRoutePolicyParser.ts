import { type ParsedPlanRouteContext, parsePlanRouteContextRecord } from './planRouteScope.js';
import { type PreviewProfilePolicy, parsePreviewProfile } from './previewProfilePolicy.js';
import { type RouteParseResult } from './routeParseIssue.js';

export interface ParsedPreviewRoutePolicy {
  readonly routeContext: ParsedPlanRouteContext;
  readonly previewProfile: PreviewProfilePolicy;
}

export function parsePreviewRoutePolicy(
  record: Record<string, unknown>
): RouteParseResult<ParsedPreviewRoutePolicy> {
  const routeContext = parsePlanRouteContextRecord(record);
  if (!routeContext.ok) {
    return routeContext;
  }

  const previewProfile = parsePreviewProfile(record.previewProfile);
  if (!previewProfile.ok) {
    return previewProfile;
  }

  return {
    ok: true,
    value: {
      routeContext: routeContext.value,
      previewProfile: previewProfile.value,
    },
  };
}
