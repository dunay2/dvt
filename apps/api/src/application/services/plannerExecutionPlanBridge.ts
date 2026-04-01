import type { ExecutionPlan, PlannerBuildResultV2 } from '@dvt/contracts';

export function bridgePlannerBuildToExecutablePlan(
  buildResult: PlannerBuildResultV2
): ExecutionPlan {
  return buildResult.plan;
}
