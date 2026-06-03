/**
 * Owned concern: validate persisted plan executability before execution admission.
 * Shared serializable result/ref vocabulary remains in `@dvt/contracts`.
 */
import type { ExecutabilityValidationResult, ScopedPlanRef } from '@dvt/contracts';

export interface PlanExecutabilityValidationInput extends ScopedPlanRef {
  readonly adapterId: string;
}

export interface IPlanExecutabilityValidator {
  validatePlan(input: PlanExecutabilityValidationInput): Promise<ExecutabilityValidationResult>;
}
