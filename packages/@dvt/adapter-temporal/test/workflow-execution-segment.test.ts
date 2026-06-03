/**
 * @file packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Verify execution segment resolution exposes only bounded layer metadata needed by the workflow
 * @consequence Adapter workflows cannot execute outside the canonical DVT plan segment contract
 * @version 1.2.0
 */
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

  it('keeps a deep linear plan segment bounded to the requested layer metadata', () => {
    const deepPlan = createExecutionPlan({
      inputHashSha256: 'c'.repeat(64),
      steps: Array.from({ length: 1_000 }, (_, index) => ({
        stepId: `s-${index}`,
        kind: 'DBT_MODEL',
        dependsOn: index === 0 ? [] : [`s-${index - 1}`],
      })),
    });

    const fullPlanSizeBytes = new globalThis.TextEncoder().encode(JSON.stringify(deepPlan)).length;
    const segment = resolveExecutionSegmentFromPlan(deepPlan, 900);
    const segmentSizeBytes = new globalThis.TextEncoder().encode(JSON.stringify(segment)).length;

    expect(segment).toMatchObject({
      layerIndex: 900,
      totalLayerCount: 1_000,
      completedStepCountBeforeLayer: 900,
      downstreamStepIdsByGatewayStepId: {},
      retainedGatewayDependencyStepIds: [],
    });
    expect(segment.steps.map((step) => step.stepId)).toEqual(['s-900']);
    expect(segment.steps[0]?.dependsOn).toEqual(['s-899']);
    expect(segmentSizeBytes).toBeLessThan(fullPlanSizeBytes / 100);
    expect(JSON.stringify(segment)).not.toContain('"stepId":"s-899"');
    expect(JSON.stringify(segment)).not.toContain('"stepId":"s-901"');
  });
});
