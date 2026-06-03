/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowFailureReasonPolicy.ts
 * @ownedConcern Governed workflow failure reason classification from runtime error evidence
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0052: PlanRef Continuation Safety
 * @decision Translate runtime error evidence into DVT RunFailed reasons at the workflow boundary
 * @consequence Terminal workflow failures stay queryable by governed reason instead of provider text
 * @version 1.0.0
 */

type ContinuationFailureReason =
  | 'WORKFLOW_FAILURE'
  | 'CURSOR_OVERFLOW'
  | 'PLAN_REF_EXPIRED'
  | 'PLAN_REF_UNAVAILABLE';

export const TEMPORAL_CONTINUATION_FAILURE_PATTERNS = {
  cursorOverflow: ['TEMPORAL_CONTINUE_AS_NEW_PAYLOAD_TOO_LARGE'],
  planRefExpired: ['PLAN_REF_EXPIRED'],
  planRefUnavailable: [
    'PLAN_BYTES_NOT_REGISTERED',
    'PLAN_REF_UNAVAILABLE',
    'PLAN_FETCH_UNAVAILABLE',
  ],
} as const;

export function resolveContinuationFailureReason(
  message: string | undefined
): ContinuationFailureReason {
  if (message === undefined) {
    return 'WORKFLOW_FAILURE';
  }

  if (hasAnyPattern(message, TEMPORAL_CONTINUATION_FAILURE_PATTERNS.cursorOverflow)) {
    return 'CURSOR_OVERFLOW';
  }

  if (hasAnyPattern(message, TEMPORAL_CONTINUATION_FAILURE_PATTERNS.planRefExpired)) {
    return 'PLAN_REF_EXPIRED';
  }

  if (hasAnyPattern(message, TEMPORAL_CONTINUATION_FAILURE_PATTERNS.planRefUnavailable)) {
    return 'PLAN_REF_UNAVAILABLE';
  }

  return 'WORKFLOW_FAILURE';
}

function hasAnyPattern(message: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}
