/**
 * @ownedConcern Define the engine port for reading plan artifacts before start-run dispatch.
 */
import type { PlanRef, RunExecutionPolicy } from '@dvt/contracts';

import type { ExecutionPlan } from '../contracts/executionPlan.js';

export interface StoredPlanArtifact {
  bytes: Uint8Array;
  executionPolicy: RunExecutionPolicy;
}

export interface IPlanFetcher {
  fetch(planRef: PlanRef): Promise<StoredPlanArtifact>;
}

export interface IPlanIntegrityValidator {
  fetchAndValidate(
    planRef: PlanRef,
    fetcher: IPlanFetcher
  ): Promise<{ plan: ExecutionPlan; executionPolicy: RunExecutionPolicy }>;
}
