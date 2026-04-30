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

export function toOptionalPayload(payload: Record<string, unknown> | undefined): {
  payload?: Record<string, unknown>;
} {
  return payload === undefined ? {} : { payload };
}
