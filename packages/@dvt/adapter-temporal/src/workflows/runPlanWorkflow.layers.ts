/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Drive Temporal layer execution from resolved DVT execution segments and canonical workflow state
 * @consequence Layer iteration remains replay-safe and bounded by the DVT execution model
 * @version 1.2.0
 */
import { segmentActivities } from './runPlanWorkflow.activities.js';
import {
  finalizeCancellationIfRequested,
  handlePreLayerLifecycle,
} from './runPlanWorkflow.cancellation.js';
import {
  emitSkippedStepsInLayer,
  maybeBuildContinueAsNewOutcome,
  selectExecutableLayer,
} from './runPlanWorkflow.layerHelpers.js';
import { applyLayerResults } from './runPlanWorkflow.layerResults.js';
import { emitStepStartedForLayer, executeLayerSteps } from './runPlanWorkflow.stepExecution.js';
import type {
  ExecutePlanLayersArgs,
  LayerLoopOutcome,
  ProcessLayerArgs,
  RunPlanWorkflowResult,
  WorkflowStep,
} from './runPlanWorkflow.types.js';

export async function executePlanLayers(args: ExecutePlanLayersArgs): Promise<LayerLoopOutcome> {
  let currentSegment = args.initialSegment;

  for (
    let layerIndex = args.nextLayerIndex;
    layerIndex < currentSegment.totalLayerCount;
    layerIndex += 1
  ) {
    if (layerIndex !== currentSegment.layerIndex) {
      currentSegment = await segmentActivities.resolveExecutionSegment({
        planRef: args.planRef,
        layerIndex,
      });
    }

    const layerOutcome = await processLayer({
      ...args,
      layerIndex,
      segment: currentSegment,
    });
    if (layerOutcome) {
      return layerOutcome;
    }
  }

  return { kind: 'all_layers_processed' };
}

async function processLayer(args: ProcessLayerArgs): Promise<LayerLoopOutcome | null> {
  const terminalOutcome = await resolvePreLayerTerminalOutcome({
    state: args.state,
    ctx: args.ctx,
    planRef: args.planRef,
    continuedAsNewCount: args.continuedAsNewCount,
  });
  if (terminalOutcome) {
    return terminalOutcome;
  }

  const executableLayer = await prepareLayerExecution(args);

  if (executableLayer.length === 0) {
    return finalizeProcessedLayer(args);
  }

  const terminalResult = await executeExecutableLayer(args, executableLayer);
  if (terminalResult) {
    return { kind: 'terminal', result: terminalResult };
  }

  return finalizeProcessedLayer(args);
}

async function prepareLayerExecution(args: ProcessLayerArgs): Promise<WorkflowStep[]> {
  const layer = args.segment.steps;
  const executableLayer = selectExecutableLayer(layer, args.runtime.skippedSteps);

  await emitSkippedStepsInLayer({
    layer,
    executableLayer,
    skippedSteps: args.runtime.skippedSteps,
    ctx: args.ctx,
    planRef: args.planRef,
  });

  args.runtime.completedSteps = args.segment.completedStepCountBeforeLayer;
  args.state.currentStepIndex = args.runtime.completedSteps;

  return executableLayer;
}

async function resolvePreLayerTerminalOutcome(args: {
  state: ProcessLayerArgs['state'];
  ctx: ProcessLayerArgs['ctx'];
  planRef: ProcessLayerArgs['planRef'];
  continuedAsNewCount: ProcessLayerArgs['continuedAsNewCount'];
}): Promise<LayerLoopOutcome | null> {
  const terminalBeforeLayer = await handlePreLayerLifecycle(args);
  if (!terminalBeforeLayer) {
    return null;
  }

  return { kind: 'terminal', result: terminalBeforeLayer };
}

async function executeExecutableLayer(
  args: ProcessLayerArgs,
  executableLayer: ReadonlyArray<WorkflowStep>
): Promise<RunPlanWorkflowResult | null> {
  await emitStepStartedForLayer(args.ctx, args.planRef, executableLayer);

  const layerResults = await executeLayerSteps({
    layer: executableLayer,
    downstreamStepIdsByGatewayStepId: args.segment.downstreamStepIdsByGatewayStepId,
    ctx: args.ctx,
    state: args.state,
    runtime: args.runtime,
  });

  return applyLayerResults({
    layerResults,
    ctx: args.ctx,
    planRef: args.planRef,
    state: args.state,
    runtime: args.runtime,
    continuedAsNewCount: args.continuedAsNewCount,
    runtimeExecutor: args.segment.runtimeExecutor,
    retainedGatewayDependencyStepIds: args.segment.retainedGatewayDependencyStepIds,
  });
}

async function finalizeProcessedLayer(args: ProcessLayerArgs): Promise<LayerLoopOutcome | null> {
  const terminalAfterLayer = await finalizeCancellationIfRequested({
    state: args.state,
    ctx: args.ctx,
    planRef: args.planRef,
    continuedAsNewCount: args.continuedAsNewCount,
  });
  if (terminalAfterLayer) {
    return { kind: 'terminal', result: terminalAfterLayer };
  }

  args.runtime.processedLayersInCurrentExecution += 1;

  return maybeBuildContinueAsNewOutcome({
    input: args.input,
    maxContinueAsNewPayloadBytes: args.input.maxContinueAsNewPayloadBytes,
    continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
    continuedAsNewCount: args.continuedAsNewCount,
    totalLayerCount: args.segment.totalLayerCount,
    layerIndex: args.layerIndex,
    processedLayersInCurrentExecution: args.runtime.processedLayersInCurrentExecution,
    gatewayDecisions: args.state.gatewayDecisions ?? {},
    gatewayDependencyFacts: args.runtime.gatewayDependencyFacts,
    latestResultEvidence: args.runtime.latestResultEvidence,
    skippedStepIds: args.runtime.skippedSteps,
    processedControlSignalIds: args.processedControlSignalIds,
  });
}
