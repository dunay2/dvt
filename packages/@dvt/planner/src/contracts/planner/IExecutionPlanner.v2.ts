import type { ExecutionPlanV2, PlannerInputEnvelopeV2 } from '../../domain/types.js';

export interface IExecutionPlanner {
  buildPlan(
    input: PlannerInputEnvelopeV2
  ): Promise<{ plan: ExecutionPlanV2; canonicalPlanJson: string }>;
}
