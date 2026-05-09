/**
 * @ownedConcern Define the engine port for validating scoped plan artifacts before dispatch.
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type { ExecutionPlan, RunExecutionPolicy, ScopedPlanRef } from '@dvt/contracts';

export interface IPlanIntegrityValidator {
  fetchAndValidate(
    input: ScopedPlanRef,
    fetcher: IStoredPlanArtifactReader
  ): Promise<{ plan: ExecutionPlan; executionPolicy: RunExecutionPolicy }>;
}
