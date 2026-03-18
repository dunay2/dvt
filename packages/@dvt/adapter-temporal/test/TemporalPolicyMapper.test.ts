import { describe, expect, it } from 'vitest';

import { TemporalPolicyMapper } from '../src/TemporalPolicyMapper.ts';

describe('TemporalPolicyMapper', () => {
  const mapper = new TemporalPolicyMapper();

  it('maps each canonical retry policy to a Temporal retry config', () => {
    expect(mapper.mapRetry({ kind: 'at-most-once' })).toEqual({
      maximumAttempts: 1,
      nonRetryableErrorTypes: ['PermanentStepError'],
    });

    expect(mapper.mapRetry({ kind: 'at-most-N', maxAttempts: 3 })).toEqual({
      initialInterval: '1s',
      maximumInterval: '60s',
      backoffCoefficient: 2,
      maximumAttempts: 3,
      nonRetryableErrorTypes: ['PermanentStepError'],
    });
  });

  it('maps each canonical timeout policy to a Temporal timeout config', () => {
    expect(mapper.mapTimeout({ kind: 'unbounded' })).toEqual({});
    expect(mapper.mapTimeout({ kind: 'budget', maxSeconds: 1800 })).toEqual({
      scheduleToCloseTimeout: '1800s',
    });
  });

  it('maps each canonical concurrency policy to a Temporal concurrency config', () => {
    expect(mapper.mapConcurrency({ kind: 'sequential' })).toEqual({
      maxConcurrentActivityTaskExecutions: 1,
      maxConcurrentWorkflowTaskExecutions: 1,
    });
    expect(mapper.mapConcurrency({ kind: 'bounded', maxParallel: 8 })).toEqual({
      maxConcurrentActivityTaskExecutions: 8,
      maxConcurrentWorkflowTaskExecutions: 8,
    });
    expect(mapper.mapConcurrency({ kind: 'unbounded' })).toEqual({});
  });
});
