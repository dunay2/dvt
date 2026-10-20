/**
 * @ownedConcern Full-plan concurrency coherence at the execution segment boundary.
 * @baseline ADR-0003: Execution Model
 * @decision Validate uniform policy across all layers through the production segment resolver.
 * @consequence Tests exercise the canonical boundary rather than copying its implementation.
 * @version 1.0.0
 */
import type { ExecutionPlan } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { resolveExecutionSegmentFromPlan } from '../src/workflows/executionSegmentResolver.js';

import { createExecutionPlan } from './helpers/contractFixtures.js';

function planWithPolicies(policies: readonly unknown[]): ExecutionPlan {
  return createExecutionPlan({
    steps: policies.map((concurrency, index) => ({
      stepId: `s-${index}`,
      kind: 'DBT_MODEL',
      dependsOn: index === 0 ? [] : [`s-${index - 1}`],
      stepTypeConfig: concurrency === undefined ? {} : { concurrency },
    })),
  });
}

describe('plan-wide concurrency projection', () => {
  it.each([1, 2, 256])('carries K=%i into every segment', (maxInFlight) => {
    const plan = planWithPolicies(Array(3).fill({ maxInFlight }));
    for (const layerIndex of [0, 1, 2]) {
      expect(resolveExecutionSegmentFromPlan(plan, layerIndex)).toHaveProperty(
        'maxInFlight',
        maxInFlight
      );
    }
  });

  it.each([[], [undefined, undefined]])('does not invent a runtime default: %j', (...policies) => {
    expect(resolveExecutionSegmentFromPlan(planWithPolicies(policies), 0)).not.toHaveProperty(
      'maxInFlight'
    );
  });

  it.each([
    [{ maxInFlight: 1 }, { maxInFlight: 2 }],
    [undefined, { maxInFlight: 2 }],
    [{ maxInFlight: 2 }, undefined],
  ])('rejects conflicting policy across layers: %j', (...policies) => {
    const plan = planWithPolicies(policies);
    expect(() => resolveExecutionSegmentFromPlan(plan, 0)).toThrow('INCONSISTENT_PLAN_CONCURRENCY');
  });

  it.each([0, -1, 1.5, '2', null, undefined])('rejects invalid maxInFlight %j', (maxInFlight) => {
    expect(() => resolveExecutionSegmentFromPlan(planWithPolicies([{ maxInFlight }]), 0)).toThrow(
      'INVALID_PLAN_CONCURRENCY'
    );
  });

  it.each([null, {}, { maxInFlight: 1, extra: true }])('rejects malformed policy %j', (policy) => {
    expect(() => resolveExecutionSegmentFromPlan(planWithPolicies([policy]), 0)).toThrow(
      'INVALID_PLAN_CONCURRENCY'
    );
  });
});
