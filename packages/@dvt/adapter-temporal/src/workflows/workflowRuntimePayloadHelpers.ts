/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowRuntimePayloadHelpers.ts
 * @ownedConcern Runtime event payload shaping
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Build run terminal event payloads from DVT runtime evidence instead of Temporal provider metadata
 * @consequence Event-sourced terminal state remains portable and replayable across orchestration adapters
 * @version 1.2.0
 */
import type { MaterializationEvidence, TransformationExecutor } from '@dvt/contracts';

export function buildRunCompletedPayload(
  runtimeExecutor: TransformationExecutor | undefined,
  latestResultEvidence: MaterializationEvidence | undefined
): Record<string, unknown> | undefined {
  if (runtimeExecutor === undefined && latestResultEvidence === undefined) {
    return undefined;
  }

  return {
    ...(runtimeExecutor === undefined ? {} : { executor: runtimeExecutor }),
    ...(latestResultEvidence === undefined ? {} : { resultEvidence: latestResultEvidence }),
  };
}

export function buildRunFailedPayload(
  runtimeExecutor: TransformationExecutor | undefined,
  error: string | undefined
): Record<string, unknown> {
  return {
    reason: 'STEP_FAILURE',
    ...(runtimeExecutor === undefined ? {} : { executor: runtimeExecutor }),
    ...(error === undefined ? {} : { message: error }),
  };
}

export function buildWorkflowFailedPayload(
  runtimeExecutor: TransformationExecutor | undefined,
  error: unknown
): Record<string, unknown> {
  const message = toErrorMessage(error);

  return {
    reason: resolveWorkflowFailureReason(message),
    ...(runtimeExecutor === undefined ? {} : { executor: runtimeExecutor }),
    ...(message === undefined ? {} : { message }),
  };
}

export function toOptionalPayload(payload: Record<string, unknown> | undefined): {
  payload?: Record<string, unknown>;
} {
  return payload === undefined ? {} : { payload };
}

function resolveWorkflowFailureReason(
  message: string | undefined
): 'WORKFLOW_FAILURE' | 'CURSOR_OVERFLOW' | 'PLAN_REF_EXPIRED' | 'PLAN_REF_UNAVAILABLE' {
  if (message === undefined) {
    return 'WORKFLOW_FAILURE';
  }

  if (message.includes('TEMPORAL_CONTINUE_AS_NEW_PAYLOAD_TOO_LARGE')) {
    return 'CURSOR_OVERFLOW';
  }

  if (message.includes('PLAN_REF_EXPIRED')) {
    return 'PLAN_REF_EXPIRED';
  }

  if (
    message.includes('PLAN_BYTES_NOT_REGISTERED') ||
    message.includes('PLAN_REF_UNAVAILABLE') ||
    message.includes('PLAN_FETCH_UNAVAILABLE')
  ) {
    return 'PLAN_REF_UNAVAILABLE';
  }

  return 'WORKFLOW_FAILURE';
}

function toErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return undefined;
}
