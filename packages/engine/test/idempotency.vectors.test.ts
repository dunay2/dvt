import { describe, expect, it } from 'vitest';

import { IdempotencyKeyBuilder } from '../src/core/idempotency.js';

describe('IdempotencyKeyBuilder vectors (RunEvents v2.0.1)', () => {
  const builder = new IdempotencyKeyBuilder();

  it('matches all 5 canonical vectors', () => {
    const vectors = [
      {
        input: {
          runId: '0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a',
          stepId: 'model.orders',
          logicalAttemptId: 1,
          eventType: 'StepStarted' as const,
          planId: 'plan_abc',
          planVersion: '2',
        },
        expected: '7f4b974658a54fb2aee9ecb9cefebd2eec27f3fd01f0f8c0d031dfc4a5b96e3c',
      },
      {
        input: {
          runId: '0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a',
          logicalAttemptId: 1,
          eventType: 'RunStarted' as const,
          planId: 'plan_abc',
          planVersion: '2',
        },
        expected: '204197f81e5dc1a8491d8e411c440a730c51a741cd48a74863d3e5c4c452640d',
      },
      {
        input: {
          runId: '0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a',
          stepId: 'model.orders',
          logicalAttemptId: 2,
          eventType: 'StepFailed' as const,
          planId: 'plan_abc',
          planVersion: '2',
        },
        expected: '599945c1a8023ece5d2ae5132a4397b8cfbe9fa1c4c08d6fc4193a9bd9a2ebcd',
      },
      {
        input: {
          runId: '0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a',
          logicalAttemptId: 1,
          eventType: 'RunFailed' as const,
          planId: 'plan_abc',
          planVersion: '3',
        },
        expected: 'b5a178e6f30962ca3d17b573c0d4c5f96d7623be5fe62a972644785fc05a003b',
      },
      {
        input: {
          runId: '0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a',
          stepId: 'seed.customers',
          logicalAttemptId: 1,
          eventType: 'StepSkipped' as const,
          planId: 'plan_abc',
          planVersion: '1',
        },
        expected: '6bfdbe26d62eac0c00cf2683aae31115e76e4d33d515e39957627be091367b31',
      },
    ];

    for (const v of vectors) {
      expect(builder.runEventKey(v.input)).toBe(v.expected);
    }
  });
});
