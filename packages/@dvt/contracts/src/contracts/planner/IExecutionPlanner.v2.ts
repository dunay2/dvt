import type { PlannerBuildResultV2, PlannerInputEnvelopeV2 } from './ExecutionPlan.v2';

/**
 * Contrato normativo del planner (GAP-P0-02).
 */
export interface IPlanner {
  buildPlan(input: PlannerInputEnvelopeV2): Promise<PlannerBuildResultV2>;
}

/**
 * Alias legacy mantenido por compatibilidad hacia atrás.
 */
export interface IExecutionPlanner extends IPlanner {}
