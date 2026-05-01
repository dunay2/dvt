import { describe, expect, it } from 'vitest';

import {
  TEMPORAL_CONTINUATION_FAILURE_PATTERNS,
  resolveContinuationFailureReason,
} from '../src/workflows/workflowFailureReasonPolicy.js';
import { buildWorkflowFailedPayload } from '../src/workflows/workflowRuntimePayloadHelpers.js';

describe('workflow runtime payload helpers', () => {
  it.each([
    {
      name: 'continue-as-new payload budget overflow',
      error: new Error('TEMPORAL_CONTINUE_AS_NEW_PAYLOAD_TOO_LARGE: sizeBytes=2048 maxBytes=1024'),
      expectedReason: 'CURSOR_OVERFLOW',
    },
    {
      name: 'expired PlanRef',
      error: new Error(
        'PLAN_REF_EXPIRED: expiresAt=2026-01-01T00:00:00.000Z now=2026-04-30T00:00:00.000Z'
      ),
      expectedReason: 'PLAN_REF_EXPIRED',
    },
    {
      name: 'unavailable PlanRef artifact',
      error: new Error('PLAN_BYTES_NOT_REGISTERED:dvt-plan://stored/missing-plan'),
      expectedReason: 'PLAN_REF_UNAVAILABLE',
    },
  ])('maps $name to a governed RunFailed reason', ({ error, expectedReason }) => {
    expect(buildWorkflowFailedPayload(undefined, error)).toMatchObject({
      reason: expectedReason,
      message: error.message,
    });
  });

  it('keeps continuation failure classification in an explicit policy module', () => {
    expect(TEMPORAL_CONTINUATION_FAILURE_PATTERNS).toEqual({
      cursorOverflow: ['TEMPORAL_CONTINUE_AS_NEW_PAYLOAD_TOO_LARGE'],
      planRefExpired: ['PLAN_REF_EXPIRED'],
      planRefUnavailable: [
        'PLAN_BYTES_NOT_REGISTERED',
        'PLAN_REF_UNAVAILABLE',
        'PLAN_FETCH_UNAVAILABLE',
      ],
    });

    expect(resolveContinuationFailureReason('PLAN_FETCH_UNAVAILABLE: object store timeout')).toBe(
      'PLAN_REF_UNAVAILABLE'
    );
  });
});
