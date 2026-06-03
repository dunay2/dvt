/**
 * @file packages/@dvt/adapter-temporal/test/runPlanWorkflow.layers.order.test.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 * @decision Verify workflow layer order follows resolved DVT execution segments and lifecycle guards
 * @consequence Temporal execution ordering remains constrained by the canonical plan layer graph
 * @version 1.2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPlanRef, createResolvedRunContext } from './helpers/contractFixtures.js';

const {
  bootstrapFirstExecutionIfNeeded,
  emitSkippedStepsInLayer,
  finalizeCancellationIfRequested,
  finalizeNativeCancellationIfNeeded,
  handlePreLayerLifecycle,
  markWorkflowFailedIfNeeded,
  maybeBuildContinueAsNewOutcome,
  segmentActivities,
  selectExecutableLayer,
} = vi.hoisted(() => ({
  segmentActivities: {
    resolveExecutionSegment: vi.fn(),
  },
  handlePreLayerLifecycle: vi.fn(),
  finalizeCancellationIfRequested: vi.fn(),
  finalizeNativeCancellationIfNeeded: vi.fn(),
  emitSkippedStepsInLayer: vi.fn(),
  selectExecutableLayer: vi.fn(),
  maybeBuildContinueAsNewOutcome: vi.fn(),
  bootstrapFirstExecutionIfNeeded: vi.fn(),
  markWorkflowFailedIfNeeded: vi.fn(),
}));

vi.mock('@temporalio/workflow', () => ({
  defineQuery: vi.fn((name: string) => ({ kind: 'query', name })),
  defineSignal: vi.fn((name: string) => ({ kind: 'signal', name })),
  setHandler: vi.fn(),
}));

vi.mock('../src/workflows/runPlanWorkflow.activities.js', () => ({
  segmentActivities,
}));

vi.mock('../src/workflows/runPlanWorkflow.cancellation.js', () => ({
  finalizeNativeCancellationIfNeeded,
  finalizeCancellationIfRequested,
  handlePreLayerLifecycle,
}));

vi.mock('../src/workflows/runPlanWorkflow.lifecycle.js', () => ({
  bootstrapFirstExecutionIfNeeded,
  markWorkflowFailedIfNeeded,
  resolveLayerLoopOutcome: vi.fn(),
}));

vi.mock('../src/workflows/runPlanWorkflow.layerHelpers.js', () => ({
  emitSkippedStepsInLayer,
  maybeBuildContinueAsNewOutcome,
  selectExecutableLayer,
}));

vi.mock('../src/workflows/runPlanWorkflow.layerResults.js', () => ({
  applyLayerResults: vi.fn(),
}));

vi.mock('../src/workflows/runPlanWorkflow.stepExecution.js', () => ({
  emitStepStartedForLayer: vi.fn(),
  executeLayerSteps: vi.fn(),
}));

describe('executePlanLayers lifecycle ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectExecutableLayer.mockReturnValue([{ stepId: 's-1', kind: 'DBT_MODEL', dependsOn: [] }]);
    finalizeCancellationIfRequested.mockResolvedValue(null);
    finalizeNativeCancellationIfNeeded.mockResolvedValue(false);
    markWorkflowFailedIfNeeded.mockResolvedValue(undefined);
    maybeBuildContinueAsNewOutcome.mockReturnValue(null);
  });

  it('checks pre-layer lifecycle before emitting skipped-step side effects', async () => {
    const { executePlanLayers } = await import('../src/workflows/runPlanWorkflow.layers.js');

    handlePreLayerLifecycle.mockResolvedValue({
      runId: 'run-1',
      status: 'CANCELLED',
      continuedAsNewCount: 0,
    });

    const input = {
      planRef: createPlanRef({
        uri: 'file://plan.json',
        sha256: 'a'.repeat(64),
        planId: 'plan-1',
      }),
      ctx: createResolvedRunContext({
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
        runId: 'run-1',
      }),
      maxContinueAsNewPayloadBytes: 1_024,
      continueAsNewAfterLayerCount: 0,
    };

    const outcome = await executePlanLayers({
      input,
      initialSegment: {
        layerIndex: 0,
        totalLayerCount: 1,
        steps: [{ stepId: 's-1', kind: 'DBT_MODEL', dependsOn: [] }],
        downstreamStepIdsByGatewayStepId: {},
        retainedGatewayDependencyStepIds: [],
        completedStepCountBeforeLayer: 0,
      },
      nextLayerIndex: 0,
      continueAsNewAfterLayerCount: 0,
      continuedAsNewCount: 0,
      ctx: input.ctx,
      planRef: input.planRef,
      state: {
        status: 'RUNNING',
        paused: false,
        cancelRequested: false,
        currentStepIndex: 0,
        continuedAsNewCount: 0,
      },
      runtime: {
        gatewayDependencyFacts: {},
        skippedSteps: new Set<string>(),
        completedSteps: 0,
        processedLayersInCurrentExecution: 0,
      },
      processedControlSignalIds: new Set<string>(),
    });

    expect(outcome).toEqual({
      kind: 'terminal',
      result: {
        runId: 'run-1',
        status: 'CANCELLED',
        continuedAsNewCount: 0,
      },
    });
    expect(handlePreLayerLifecycle).toHaveBeenCalledTimes(1);
    expect(emitSkippedStepsInLayer).not.toHaveBeenCalled();
  });

  it('does not execute layers when initial segment resolution fails integrity validation', async () => {
    const layersModule = await import('../src/workflows/runPlanWorkflow.layers.js');
    const executePlanLayersSpy = vi.spyOn(layersModule, 'executePlanLayers');
    const { runPlanWorkflow } = await import('../src/workflows/RunPlanWorkflow.js');
    const integrityError = new Error('PLAN_INTEGRITY_VALIDATION_FAILED');

    segmentActivities.resolveExecutionSegment.mockRejectedValue(integrityError);

    await expect(
      runPlanWorkflow({
        planRef: createPlanRef({
          uri: 'file://plan.json',
          sha256: 'a'.repeat(64),
          planId: 'plan-1',
        }),
        ctx: createResolvedRunContext({
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'env-1',
          runId: 'run-1',
        }),
        maxContinueAsNewPayloadBytes: 1_024,
        continueAsNewAfterLayerCount: 1,
      })
    ).rejects.toThrow('PLAN_INTEGRITY_VALIDATION_FAILED');

    expect(executePlanLayersSpy).not.toHaveBeenCalled();
    expect(bootstrapFirstExecutionIfNeeded).not.toHaveBeenCalled();
    expect(markWorkflowFailedIfNeeded).toHaveBeenCalledTimes(1);
  });
});
