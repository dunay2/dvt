import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

type StartRunPlanSourceDecision = { readonly kind: 'planRef' } | { readonly kind: 'plannerBacked' };

export function evaluateStartRunPlanSource(
  record: Record<string, unknown>
): RouteParseResult<StartRunPlanSourceDecision> {
  const plannerSourceCount = countPlannerSources(record);
  const hasPlanRef = record.planRef !== undefined;

  if (hasPlanRef && plannerSourceCount > 0) {
    return badRequestResult(HTTP_ERROR_REASON.conflictingPlanInputs);
  }

  if (!hasPlanRef && plannerSourceCount !== 1) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  return hasPlanRef ? { ok: true, value: { kind: 'planRef' } } : { ok: true, value: { kind: 'plannerBacked' } };
}

function countPlannerSources(record: Record<string, unknown>): number {
  return ['graphSource', 'manifestRef', 'manifest', 'nodes'].filter(
    (key) => record[key] !== undefined
  ).length;
}
