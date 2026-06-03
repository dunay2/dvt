/**
 * @ownedConcern Define stable Temporal activity failure codes and non-retryable failure construction.
 */
import { ApplicationFailure } from '@temporalio/activity';

export const ActivityErrorCode = {
  INVALID_STEP_SCHEMA: 'INVALID_STEP_SCHEMA',
  INVALID_GATEWAY_DSL: 'INVALID_GATEWAY_DSL',
  UNSUPPORTED_STEP_KIND: 'UNSUPPORTED_STEP_KIND',
  RUN_EXECUTION_CONTEXT_REQUIRED: 'RUN_EXECUTION_CONTEXT_REQUIRED',
  TRANSIENT_STEP_ERROR: 'TRANSIENT_STEP_ERROR',
  PERMANENT_STEP_ERROR: 'PERMANENT_STEP_ERROR',
} as const;

export const PERMANENT_STEP_ERROR_TYPE = 'PermanentStepError';

export function createPermanentStepFailure(message: string): ApplicationFailure {
  return ApplicationFailure.create({
    type: PERMANENT_STEP_ERROR_TYPE,
    message,
    nonRetryable: true,
  });
}
