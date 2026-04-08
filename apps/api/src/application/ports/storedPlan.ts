import type { PlanRefSchemaT, RunExecutionPolicy } from '@dvt/contracts';

export interface StoredPlanArtifact {
  bytes: Uint8Array;
  executionPolicy: RunExecutionPolicy;
}

export interface IStoredPlanValidationReader {
  fetchForValidation(planRef: PlanRefSchemaT): Promise<StoredPlanArtifact>;
}
