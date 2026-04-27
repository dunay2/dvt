import type { ExecutionBindingVerificationResult } from '@dvt/contracts';

/**
 * Planner-owned behavior port for verifying compiled artifact bindings.
 * Shared serializable binding result vocabulary remains in `@dvt/contracts`.
 */
export interface IExecutionBindingVerifier {
  verifyStepBinding(
    planId: string,
    stepId: string,
    storageUri: string,
    expectedSha256: string
  ): Promise<ExecutionBindingVerificationResult>;
}
