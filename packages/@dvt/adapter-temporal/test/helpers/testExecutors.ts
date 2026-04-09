/**
 * @file test/helpers/testExecutors.ts
 *
 * Injectable StepExecutor test doubles that replace the `simulateError` plan field.
 * Use these with `createActivities(deps, [...testExecutors, ...DEFAULT_STEP_EXECUTORS])`
 * to simulate step failures without polluting production code or plan fixtures.
 */
import type { MaterializationEvidence } from '@dvt/contracts';
import { ApplicationFailure } from '@temporalio/activity';

import { DEFAULT_STEP_EXECUTORS, type StepExecutor } from '../../src/activities/stepActivities.js';

/**
 * Executor that throws a retryable (transient) Error for the target step.
 * Equivalent to the former `simulateError: 'transient'` plan field.
 */
export function transientErrorExecutor(targetStepId: string): StepExecutor {
  return {
    canExecute: (step) => step.stepId === targetStepId,
    async execute(step) {
      throw new Error(`TRANSIENT_STEP_ERROR:${step.stepId}`);
    },
  };
}

/**
 * Executor that throws a non-retryable (permanent) ApplicationFailure for the target step.
 * Equivalent to the former `simulateError: 'permanent'` plan field.
 */
export function permanentErrorExecutor(targetStepId: string): StepExecutor {
  return {
    canExecute: (step) => step.stepId === targetStepId,
    async execute(step) {
      throw ApplicationFailure.create({
        type: 'PermanentStepError',
        message: `PERMANENT_STEP_ERROR:${step.stepId}`,
        nonRetryable: true,
      });
    },
  };
}

/**
 * Executor that completes the target step and returns governed result evidence.
 */
export function materializationEvidenceExecutor(
  targetStepId: string,
  resultEvidence: MaterializationEvidence
): StepExecutor {
  return {
    canExecute: (step) => step.stepId === targetStepId,
    async execute(step) {
      return {
        stepId: step.stepId,
        status: 'COMPLETED',
        resultEvidence,
      };
    },
  };
}

/**
 * Builds a full executor chain with the given error executors taking priority
 * over the default registry. Convenience helper for worker setup in integration tests.
 */
export function withErrorExecutors(...errorExecutors: StepExecutor[]): readonly StepExecutor[] {
  return [...errorExecutors, ...DEFAULT_STEP_EXECUTORS];
}
