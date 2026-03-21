import type { PlanRefSchemaT } from '@dvt/contracts';

export interface IStoredPlanValidationReader {
  fetchForValidation(planRef: PlanRefSchemaT): Promise<Uint8Array>;
}
