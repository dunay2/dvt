import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export type PlanRoutePlanSourceDecision =
  | { readonly kind: 'planRef' }
  | { readonly kind: 'plannerBacked' };

const FORBIDDEN_PLANNER_SOURCE_KEYS = ['manifestRef', 'nodes', 'manifest'] as const;

export function evaluatePlanRoutePlanSource(
  record: Record<string, unknown>
): RouteParseResult<PlanRoutePlanSourceDecision> {
  if (hasForbiddenPlannerSource(record)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  const hasPlanRef = record.planRef !== undefined;
  const hasGraphSource = record.graphSource !== undefined;
  const hasPlannerBackedFields = hasGraphSource || hasPlannerBackedMetadata(record);

  if (hasPlanRef && hasPlannerBackedFields) {
    return badRequestResult(HTTP_ERROR_REASON.conflictingPlanInputs);
  }

  if (!hasPlanRef && !hasGraphSource) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  return hasPlanRef
    ? { ok: true, value: { kind: 'planRef' } }
    : { ok: true, value: { kind: 'plannerBacked' } };
}

function hasPlannerBackedMetadata(record: Record<string, unknown>): boolean {
  return ['policies', 'environment', 'observability'].some(
    (key) => record[key] !== undefined
  );
}

function hasForbiddenPlannerSource(record: Record<string, unknown>): boolean {
  return FORBIDDEN_PLANNER_SOURCE_KEYS.some((key) => record[key] !== undefined);
}
