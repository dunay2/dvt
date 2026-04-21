import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPlanRef, createResolvedRunContext } from './helpers/contractFixtures.js';

const {
  emitSkippedStepsInLayer,
  finalizeCancellationIfRequested,
  handlePreLayerLifecycle,
  maybeBuildContinueAsNewOutcome,
  segmentActivities,
  selectExecutableLayer,
} = vi.hoisted(() => ({
  segmentActivities: {
    resolveExecutionSegment: vi.fn(),
  },
  handlePreLayerLifecycle: vi.fn(),
  finalizeCancellationIfRequested: vi.fn(),
  emitSkippedStepsInLayer: vi.fn(),
  selectExecutableLayer: vi.fn(),
  maybeBuildContinueAsNewOutcome: vi.fn(),
}));

vi.mock('../src/workflows/runPlanWorkflow.activities.js', () => ({
  segmentActivities,
}));

vi.mock('../src/workflows/runPlanWorkflow.cancellation.js', () => ({
  finalizeCancellationIfRequested,
  handlePreLayerLifecycle,
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
});
