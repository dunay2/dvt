import { describe, expect, it } from 'vitest';

import { resolveStepActivityRetryPolicy } from '../src/workflows/workflowHelpers.js';

describe('resolveStepActivityRetryPolicy', () => {
  it('uses the explicit ExecutionStep retryPolicy when present', () => {
    const retryPolicy = resolveStepActivityRetryPolicy({
      retryPolicy: {
        maxAttempts: 5,
        initialInterval: '3s',
        maximumInterval: '45s',
        backoffCoefficient: 3,
      },
    });

    expect(retryPolicy).toEqual({
      maximumAttempts: 5,
      initialInterval: '3s',
      maximumInterval: '45s',
      backoffCoefficient: 3,
      nonRetryableErrorTypes: ['PermanentStepError'],
    });
  });

  it('uses the governed default when no per-step retry metadata exists', () => {
    const retryPolicy = resolveStepActivityRetryPolicy({});

    expect(retryPolicy).toEqual({
      maximumAttempts: 3,
      initialInterval: '1s',
      maximumInterval: '60s',
      backoffCoefficient: 2,
      nonRetryableErrorTypes: ['PermanentStepError'],
    });
  });

  it('rejects legacy retry metadata when it is placed inside stepTypeConfig', () => {
    expect(() =>
      resolveStepActivityRetryPolicy({
        stepTypeConfig: {
          retries: {
            maxAttempts: 2,
            backoffMs: 4000,
          },
        },
      })
    ).toThrowError(new TypeError('INVALID_PLAN_SCHEMA: step_retryPolicy_must_be_top_level'));
  });
});
