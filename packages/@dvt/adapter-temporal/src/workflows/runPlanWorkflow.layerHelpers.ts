/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerHelpers.ts
 * @ownedConcern Layer selection and continue-as-new decision helpers
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Keep layer cursor, skipped-step emission, and continue-as-new handoff derived from DVT workflow state
 * @consequence Provider continuation mechanics preserve canonical DVT layer progress and lifecycle evidence
 * @version 1.2.0
 */
import type { MaterializationEvidence } from '@dvt/contracts';

import { eventActivities } from './runPlanWorkflow.activities.js';
import type {
  LayerLoopOutcome,
  RunPlanWorkflowInput,
  WorkflowCtx,
  WorkflowPlanRef,
  WorkflowStep,
} from './runPlanWorkflow.types.js';
import { buildContinueAsNewInput, shouldTriggerContinueAsNew } from './workflowCursorHelpers.js';
import { normalizeDependsOn } from './workflowGatewayHelpers.js';

export function maybeBuildContinueAsNewOutcome(args: {
  input: RunPlanWorkflowInput;
  maxContinueAsNewPayloadBytes: number;
  continueAsNewAfterLayerCount: number;
  continuedAsNewCount: number;
  totalLayerCount: number;
  layerIndex: number;
  processedLayersInCurrentExecution: number;
  gatewayDecisions: Record<string, boolean>;
  gatewayDependencyFacts: Record<string, Record<string, unknown>>;
  latestResultEvidence?: MaterializationEvidence;
  skippedStepIds: ReadonlySet<string>;
  processedControlSignalIds: ReadonlySet<string>;
}): LayerLoopOutcome | null {
  const nextLayerIndex = args.layerIndex + 1;
  if (
    !shouldTriggerContinueAsNew({
      continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
      processedLayersInCurrentExecution: args.processedLayersInCurrentExecution,
      nextLayerIndex,
      totalLayerCount: args.totalLayerCount,
    })
  ) {
    return null;
  }

  return {
    kind: 'continue_as_new',
    nextInput: buildContinueAsNewInput({
      input: args.input,
      maxContinueAsNewPayloadBytes: args.maxContinueAsNewPayloadBytes,
      continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
      nextLayerIndex,
      continuedAsNewCount: args.continuedAsNewCount,
      gatewayDecisions: args.gatewayDecisions,
      gatewayDependencyFacts: args.gatewayDependencyFacts,
      latestResultEvidence: args.latestResultEvidence,
      skippedStepIds: args.skippedStepIds,
      processedControlSignalIds: args.processedControlSignalIds,
    }),
  };
}

export function selectExecutableLayer(
  layer: ReadonlyArray<WorkflowStep>,
  skippedSteps: ReadonlySet<string>
): WorkflowStep[] {
  return layer.filter((step) => {
    if (skippedSteps.has(step.stepId)) {
      return false;
    }

    const dependencies = normalizeDependsOn(step.dependsOn);
    return !dependencies.some((dependencyStepId) => skippedSteps.has(dependencyStepId));
  });
}

export async function emitSkippedStepsInLayer(args: {
  layer: ReadonlyArray<WorkflowStep>;
  executableLayer: ReadonlyArray<WorkflowStep>;
  skippedSteps: Set<string>;
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
}): Promise<void> {
  const executableIds = new Set(args.executableLayer.map((step) => step.stepId));
  for (const step of args.layer) {
    if (executableIds.has(step.stepId)) {
      continue;
    }

    args.skippedSteps.add(step.stepId);
    await eventActivities.emitEvent({
      ctx: args.ctx,
      planRef: args.planRef,
      eventType: 'StepSkipped',
      stepId: step.stepId,
    });
  }
}
