/**
 * Owned concern: validate persisted plan executability before execution admission.
 * Shared serializable result/ref vocabulary remains in `@dvt/contracts`.
 */
import type { ExecutabilityValidationResult, PlanRefSchemaT } from '@dvt/contracts';

export interface IPlanExecutabilityValidator {
  validatePlan(planRef: PlanRefSchemaT, adapterId: string): Promise<ExecutabilityValidationResult>;
}
