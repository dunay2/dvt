import { describe, expect, it } from 'vitest';

import { dbtStepFactory } from '../../src/domain/stepFactory/dbtStepFactory.js';
import type { GraphNode, ResolvedPolicies } from '../../src/domain/types.js';

describe('dbtStepFactory', () => {
  it('enforces policy-first precedence over node stepTypeConfig', () => {
    const node: GraphNode = {
      nodeId: 'model.analytics.orders',
      stepKind: 'DBT_MODEL',
      dependsOn: [],
      stepTypeConfig: {
        retries: 99,
        stepTimeoutMs: 900000,
        concurrency: 128,
        callerOwned: 'kept',
      },
    };

    const resolvedPolicies: ResolvedPolicies = {
      retries: 2,
      stepTimeoutMs: 30000,
      concurrency: 4,
    };

    const step = dbtStepFactory(node, resolvedPolicies);

    expect(step.kind).toBe('DBT_MODEL');
    expect(step.stepTypeConfig).toMatchObject({
      retries: 2,
      stepTimeoutMs: 30000,
      concurrency: 4,
      callerOwned: 'kept',
    });
  });
});
