import type { PlannerBuildResultV2 } from '@dvt/contracts';
import type { ExecutionPlan } from '@dvt/engine';

const ENGINE_EXECUTION_PLAN_SCHEMA_VERSION = 'v1.2';
const ENGINE_EXECUTION_PLAN_CONTRACT_VERSION = '1.0.0';

export function bridgePlannerBuildToExecutablePlan(
  buildResult: PlannerBuildResultV2
): ExecutionPlan {
  return {
    metadata: {
      planId: buildResult.plan.metadata.planId,
      planVersion: buildResult.plan.metadata.planVersion,
      schemaVersion: ENGINE_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: ENGINE_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256: buildResult.plan.metadata.inputHashSha256,
    },
    steps: buildResult.plan.steps.map((step) => ({
      stepId: step.stepId,
      kind: step.kind,
      dependsOn: [...step.dependsOn],
    })),
  };
}
