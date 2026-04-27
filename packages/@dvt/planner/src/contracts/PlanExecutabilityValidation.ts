import type { ExecutabilityValidationResult, PlanRefSchemaT } from '@dvt/contracts';

/**
 * Planner-owned behavior port for validating a persisted plan before execution.
 * Shared serializable result vocabulary remains in `@dvt/contracts`.
 */
export interface IPlanExecutabilityValidator {
  validatePlan(planRef: PlanRefSchemaT, adapterId: string): Promise<ExecutabilityValidationResult>;
}
