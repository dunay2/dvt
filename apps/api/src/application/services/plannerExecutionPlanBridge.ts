import type { ExecutionPlan, PlannerBuildResultV1 } from '@dvt/contracts';

export function bridgePlannerBuildToExecutablePlan(
  buildResult: PlannerBuildResultV1
): ExecutionPlan {
  return buildResult.plan;
}
