/**
 * Owned concern: verify compiled artifact bindings for planner-authored steps.
 * Shared serializable binding result vocabulary remains in `@dvt/contracts`.
 */
import type { ExecutionBindingVerificationResult } from '@dvt/contracts';

export interface IExecutionBindingVerifier {
  verifyStepBinding(
    planId: string,
    stepId: string,
    storageUri: string,
    expectedSha256: string
  ): Promise<ExecutionBindingVerificationResult>;
}
