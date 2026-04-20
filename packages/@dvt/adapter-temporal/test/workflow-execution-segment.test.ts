import type { ExecutionPlan } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { resolveExecutionSegmentFromPlan } from '../src/workflows/executionSegmentResolver.js';

import { createExecutionPlan } from './helpers/contractFixtures.js';

const PLAN: ExecutionPlan = createExecutionPlan({
  observability: {
    extra: {
      transformationFlowRuntime: {
        previewProfile: 'default',
        executor: 'dbt',
      },
    },
  },
  steps: [
    { stepId: 's-1', kind: 'DBT_MODEL', dependsOn: [] },
    {
      stepId: 'gw-1',
      kind: 'GATEWAY',
      type: 'gateway' as const,
      dependsOn: ['s-1'],
      gateway: { dslVersion: '1.0' as const, expression: "status='COMPLETED'" },
    },
    { stepId: 's-2', kind: 'DBT_MODEL', dependsOn: ['gw-1'] },
  ],
});

describe('resolveExecutionSegmentFromPlan', () => {
  it('returns only the requested layer plus bounded metadata needed by the workflow', () => {
    const segment = resolveExecutionSegmentFromPlan(PLAN, 0);

    expect(segment).toEqual({
      layerIndex: 0,
      totalLayerCount: 3,
      runtimeExecutor: 'dbt',
      steps: [{ stepId: 's-1', kind: 'DBT_MODEL', dependsOn: [] }],
      downstreamStepIdsByGatewayStepId: {},
      retainedGatewayDependencyStepIds: ['s-1'],
      completedStepCountBeforeLayer: 0,
    });
  });

  it('includes downstream skip metadata for gateway layers', () => {
    const segment = resolveExecutionSegmentFromPlan(PLAN, 1);

    expect(segment.steps.map((step) => step.stepId)).toEqual(['gw-1']);
    expect(segment.downstreamStepIdsByGatewayStepId).toEqual({
      'gw-1': ['s-2'],
    });
    expect(segment.retainedGatewayDependencyStepIds).toEqual([]);
    expect(segment.completedStepCountBeforeLayer).toBe(1);
  });

  it('rejects out-of-range positive layer indices', () => {
    expect(() => resolveExecutionSegmentFromPlan(PLAN, 4)).toThrow(
      'INVALID_WORKFLOW_STATE: nextLayerIndex_out_of_range'
    );
  });

  it('returns an empty terminal segment for empty plans at layer zero', () => {
    const segment = resolveExecutionSegmentFromPlan(
      createExecutionPlan({
        inputHashSha256: PLAN.metadata.inputHashSha256,
        createdAtIso: PLAN.metadata.createdAtIso,
        steps: [],
      }),
      0
    );

    expect(segment).toEqual({
      layerIndex: 0,
      totalLayerCount: 0,
      runtimeExecutor: undefined,
      steps: [],
      downstreamStepIdsByGatewayStepId: {},
      retainedGatewayDependencyStepIds: [],
      completedStepCountBeforeLayer: 0,
    });
  });
});
