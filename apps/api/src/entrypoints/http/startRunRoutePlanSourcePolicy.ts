import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

type StartRunPlanSourceDecision = { readonly kind: 'planRef' } | { readonly kind: 'plannerBacked' };
const FORBIDDEN_PLANNER_SOURCE_KEYS = ['manifestRef', 'nodes', 'manifest'] as const;

export function evaluateStartRunPlanSource(
  record: Record<string, unknown>
): RouteParseResult<StartRunPlanSourceDecision> {
  if (hasForbiddenPlannerSource(record)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  const plannerSourceCount = countPlannerSources(record);
  const hasPlanRef = record.planRef !== undefined;

  if (hasPlanRef && plannerSourceCount > 0) {
    return badRequestResult(HTTP_ERROR_REASON.conflictingPlanInputs);
  }

  if (!hasPlanRef && plannerSourceCount !== 1) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  return hasPlanRef
    ? { ok: true, value: { kind: 'planRef' } }
    : { ok: true, value: { kind: 'plannerBacked' } };
}

function countPlannerSources(record: Record<string, unknown>): number {
  return ['graphSource'].filter((key) => record[key] !== undefined).length;
}

function hasForbiddenPlannerSource(record: Record<string, unknown>): boolean {
  return FORBIDDEN_PLANNER_SOURCE_KEYS.some((key) => record[key] !== undefined);
}
