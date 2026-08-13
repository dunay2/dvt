import type { ExecutionPlan, PlanRef } from '@dvt/contracts';

export interface ImportPlanRouteResponse {
  readonly plan: ExecutionPlan;
  readonly planRef: PlanRef;
}

export function buildImportPlanResponse(
  plan: ExecutionPlan,
  planRef: PlanRef
): ImportPlanRouteResponse {
  return {
    plan,
    planRef,
  };
}
