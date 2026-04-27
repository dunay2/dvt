/**
 * @file packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
 * @ownedConcern Temporal PlanRef workflow orchestration entrypoint
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 5 - Workflow remains deterministic and delegates side effects to activities
 * @decision Section 3 - Lifecycle signaling/query handling follows canonical run state transitions
 * @consequence Temporal workflow execution is replay-safe and aligned with engine lifecycle contracts
 * @version 1.2.0
 * @date 2026-04-20
 */
/**
 * RunPlanWorkflow - Temporal interpreter workflow (deterministic).
 *
 * Runs inside a Temporal V8 sandbox. Only imports from
 * `@temporalio/workflow` and type-only references are allowed.
 *
 * Determinism rules enforced:
 *  - Zero `Date.now()` / `new Date()`
 *  - Zero `Math.random()`
 *  - Zero `process.env`
 *  - Zero Node.js / DOM APIs
 */
import type { TransformationExecutor } from '@dvt/contracts';

import { segmentActivities } from './runPlanWorkflow.activities.js';
import { finalizeNativeCancellationIfNeeded } from './runPlanWorkflow.cancellation.js';
import { executePlanLayers } from './runPlanWorkflow.layers.js';
import {
  bootstrapFirstExecutionIfNeeded,
  markWorkflowFailedIfNeeded,
  resolveLayerLoopOutcome,
} from './runPlanWorkflow.lifecycle.js';
import { createInitialWorkflowState, registerSignalHandlers } from './runPlanWorkflow.signals.js';
import { cloneStepResults, parseWorkflowControlInput } from './runPlanWorkflow.state.js';
import type {
  LayerRuntimeState,
  RunPlanWorkflowInput,
  RunPlanWorkflowResult,
} from './runPlanWorkflow.types.js';

export type { RunPlanWorkflowInput, RunPlanWorkflowResult } from './runPlanWorkflow.types.js';
export { cancelSignal, pauseSignal, resumeSignal } from './runPlanWorkflow.signals.js';

export async function runPlanWorkflow(input: RunPlanWorkflowInput): Promise<RunPlanWorkflowResult> {
  const { planRef, ctx } = input;
  const ctrl = parseWorkflowControlInput(input);

  const state = createInitialWorkflowState(ctrl.continuedAsNewCount, ctrl.gatewayDecisions);
  const processedControlSignalIds = new Set(ctrl.processedControlSignalIds);
  registerSignalHandlers(state, processedControlSignalIds);

  const runtime: LayerRuntimeState = {
    gatewayDependencyFacts: cloneStepResults(ctrl.gatewayDependencyFacts),
    skippedSteps: new Set(ctrl.skippedStepIds),
    completedSteps: 0,
    processedLayersInCurrentExecution: 0,
    latestResultEvidence: ctrl.latestResultEvidence,
  };

  let runtimeExecutor: TransformationExecutor | undefined;

  try {
    const firstSegment = await segmentActivities.resolveExecutionSegment({
      planRef,
      layerIndex: ctrl.nextLayerIndex,
    });
    runtimeExecutor = firstSegment.runtimeExecutor;

    await bootstrapFirstExecutionIfNeeded(ctrl.nextLayerIndex, ctx, planRef, runtimeExecutor);

    runtime.completedSteps = firstSegment.completedStepCountBeforeLayer;
    state.currentStepIndex = runtime.completedSteps;

    const layerOutcome = await executePlanLayers({
      input,
      initialSegment: firstSegment,
      nextLayerIndex: ctrl.nextLayerIndex,
      continueAsNewAfterLayerCount: ctrl.continueAsNewAfterLayerCount,
      continuedAsNewCount: ctrl.continuedAsNewCount,
      ctx,
      planRef,
      state,
      runtime,
      processedControlSignalIds,
    });

    return resolveLayerLoopOutcome({
      layerOutcome,
      ctx,
      planRef,
      state,
      continuedAsNewCount: ctrl.continuedAsNewCount,
      runtimeExecutor,
      latestResultEvidence: runtime.latestResultEvidence,
    });
  } catch (error) {
    // Native Temporal cancellation can interrupt the paused wait path directly,
    // so the root catch remains the canonical place to emit terminal cancellation.
    const nativeCancellationFinalized = await finalizeNativeCancellationIfNeeded({
      error,
      state,
      ctx,
      planRef,
      continuedAsNewCount: ctrl.continuedAsNewCount,
    });
    if (nativeCancellationFinalized) {
      throw error;
    }

    await markWorkflowFailedIfNeeded(state, ctx, planRef, runtimeExecutor);
    throw error;
  }
}
