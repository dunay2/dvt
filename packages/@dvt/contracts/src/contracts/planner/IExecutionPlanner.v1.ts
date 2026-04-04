import type { PlannerBuildResultV1, PlannerInputEnvelopeV1 } from './ExecutionPlan.v1.js';

/**
 * Canonical planner contract.
 */
export interface IPlanner {
  buildPlan(input: PlannerInputEnvelopeV1): Promise<PlannerBuildResultV1>;
}

/**
 * Named planner contract alias used by existing consumers.
 */
export interface IExecutionPlanner extends IPlanner {}
