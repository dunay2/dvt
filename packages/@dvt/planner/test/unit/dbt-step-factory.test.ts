import { describe, expect, it } from 'vitest';

import { resolvePolicies } from '../../src/domain/policies.js';
import { dbtStepFactory } from '../../src/domain/stepFactory/dbtStepFactory.js';
import type { GraphNode } from '../../src/domain/types.js';

describe('dbtStepFactory', () => {
  it('enforces policy-first precedence over node stepTypeConfig', () => {
    const node: GraphNode = {
      nodeId: 'model.analytics.orders',
      stepKind: 'DBT_MODEL',
      dependsOn: [],
      stepTypeConfig: {
        stepTimeoutMs: 900000,
        concurrency: 128,
        callerOwned: 'kept',
      },
    };

    const resolvedPolicies = resolvePolicies({
      retry: { kind: 'at-most-N', maxAttempts: 2 },
      timeout: { kind: 'budget', maxSeconds: 30 },
      concurrency: { kind: 'bounded', maxParallel: 4 },
    });

    const step = dbtStepFactory(node, resolvedPolicies);

    expect(step.kind).toBe('DBT_MODEL');
    expect(step.retryPolicy).toEqual({
      maxAttempts: 2,
      initialInterval: '1s',
      maximumInterval: '60s',
      backoffCoefficient: 2,
    });
    expect(step.stepTypeConfig).toMatchObject({
      stepTimeoutMs: 30000,
      concurrency: {
        maxInFlight: 4,
      },
      callerOwned: 'kept',
    });
  });

  it('clears node timeout and concurrency when resolved policy is unbounded', () => {
    const node: GraphNode = {
      nodeId: 'model.analytics.orders',
      stepKind: 'DBT_MODEL',
      dependsOn: [],
      stepTypeConfig: {
        stepTimeoutMs: 900000,
        concurrency: { maxInFlight: 128 },
        callerOwned: 'kept',
      },
    };

    const resolvedPolicies = resolvePolicies({
      retry: { kind: 'at-most-once' },
      timeout: { kind: 'unbounded' },
      concurrency: { kind: 'unbounded' },
    });

    const step = dbtStepFactory(node, resolvedPolicies);
    const stepTypeConfig = step.stepTypeConfig as Record<string, unknown>;

    expect(step.retryPolicy).toEqual({
      maxAttempts: 1,
      initialInterval: '1s',
      maximumInterval: '60s',
      backoffCoefficient: 2,
    });
    expect(stepTypeConfig).not.toHaveProperty('stepTimeoutMs');
    expect(stepTypeConfig).not.toHaveProperty('concurrency');
    expect(stepTypeConfig).toMatchObject({
      callerOwned: 'kept',
    });
  });
});
