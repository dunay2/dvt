/** Owned concern: answer whether a persisted run plan requires execution context. */
import type { RunMetadata } from '@dvt/engine';

export type RunExecutionContextRequirement = 'required' | 'not_required' | 'unknown';

export interface IRunExecutionContextRequirementResolver {
  resolve(
    metadata: Pick<RunMetadata, 'tenantId' | 'projectId' | 'environmentId' | 'planId'>
  ): Promise<RunExecutionContextRequirement>;
}
