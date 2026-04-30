import type { PlanRefSchemaT } from '@dvt/contracts';
import type { StoredPlanArtifact } from '@dvt/engine';

export interface IStoredPlanValidationReader {
  fetchForValidation(planRef: PlanRefSchemaT): Promise<StoredPlanArtifact>;
}
