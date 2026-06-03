/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts
 * @ownedConcern Layer result application and gateway fact retention
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Translate layer activity outcomes into canonical run events and gateway facts owned by DVT
 * @consequence Temporal layer completion updates event-sourced lifecycle state without becoming the source of truth
 * @version 1.2.0
 */
import type { TransformationExecutor } from '@dvt/contracts';

import { eventActivities } from './runPlanWorkflow.activities.js';
import type {
  LayerRuntimeState,
  LayerStepExecution,
  RunPlanWorkflowResult,
  RuntimeWorkflowState,
  WorkflowCtx,
  WorkflowPlanRef,
} from './runPlanWorkflow.types.js';
import { buildCompletedStepFact } from './workflowGatewayHelpers.js';
import { buildRunFailedPayload, toOptionalPayload } from './workflowRuntimePayloadHelpers.js';

export async function applyLayerResults(args: {
  layerResults: ReadonlyArray<LayerStepExecution>;
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  state: RuntimeWorkflowState;
  runtime: LayerRuntimeState;
  continuedAsNewCount: number;
  runtimeExecutor?: TransformationExecutor;
  retainedGatewayDependencyStepIds: ReadonlyArray<string>;
}): Promise<RunPlanWorkflowResult | null> {
  for (const layerStepResult of args.layerResults) {
    const terminalResult = await processLayerStepResult(args, layerStepResult);
    if (terminalResult !== null) {
      return terminalResult;
    }
  }

  pruneGatewayDependencyFacts(
    args.runtime.gatewayDependencyFacts,
    args.retainedGatewayDependencyStepIds
  );
  return null;
}

async function processLayerStepResult(
  args: {
    ctx: WorkflowCtx;
    planRef: WorkflowPlanRef;
    state: RuntimeWorkflowState;
    runtime: LayerRuntimeState;
    continuedAsNewCount: number;
    runtimeExecutor?: TransformationExecutor;
    retainedGatewayDependencyStepIds: ReadonlyArray<string>;
  },
  layerStepResult: LayerStepExecution
): Promise<RunPlanWorkflowResult | null> {
  const { stepId, result, gatewayDecision } = layerStepResult;

  if (result.status === 'COMPLETED') {
    await handleCompletedStepResult({
      stepId,
      gatewayDecision,
      resultEvidence: result.resultEvidence,
      ctx: args.ctx,
      planRef: args.planRef,
      state: args.state,
      runtime: args.runtime,
      retainedGatewayDependencyStepIds: args.retainedGatewayDependencyStepIds,
    });
    return null;
  }

  return handleFailedStepResult({
    stepId,
    failureReason: result.failureReason,
    error: result.error,
    ctx: args.ctx,
    planRef: args.planRef,
    state: args.state,
    continuedAsNewCount: args.continuedAsNewCount,
    runtimeExecutor: args.runtimeExecutor,
  });
}

async function handleCompletedStepResult(args: {
  stepId: string;
  gatewayDecision: boolean | undefined;
  resultEvidence: LayerStepExecution['result']['resultEvidence'] | undefined;
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  state: RuntimeWorkflowState;
  runtime: LayerRuntimeState;
  retainedGatewayDependencyStepIds: ReadonlyArray<string>;
}): Promise<void> {
  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'StepCompleted',
    stepId: args.stepId,
    ...toOptionalPayload(buildCompletedPayload(args.gatewayDecision, args.resultEvidence)),
  });

  if (args.retainedGatewayDependencyStepIds.includes(args.stepId)) {
    args.runtime.gatewayDependencyFacts[args.stepId] = buildCompletedStepFact(
      args.stepId,
      args.gatewayDecision,
      args.resultEvidence
    );
  }

  if (args.resultEvidence !== undefined) {
    args.runtime.latestResultEvidence = args.resultEvidence;
  }

  args.runtime.completedSteps += 1;
  args.state.currentStepIndex = args.runtime.completedSteps;
}

async function handleFailedStepResult(args: {
  stepId: string;
  failureReason: string | undefined;
  error: string | undefined;
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  state: RuntimeWorkflowState;
  continuedAsNewCount: number;
  runtimeExecutor?: TransformationExecutor;
}): Promise<RunPlanWorkflowResult> {
  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'StepFailed',
    stepId: args.stepId,
    ...toOptionalPayload(buildFailedStepPayload(args.failureReason, args.error)),
  });
  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'RunFailed',
    payload: buildRunFailedPayload(args.runtimeExecutor, args.error),
  });

  args.state.status = 'FAILED';
  return {
    runId: args.ctx.runId,
    status: 'FAILED',
    continuedAsNewCount: args.continuedAsNewCount,
  };
}

function buildCompletedPayload(
  gatewayDecision: boolean | undefined,
  resultEvidence: LayerStepExecution['result']['resultEvidence'] | undefined
): Record<string, unknown> | undefined {
  if (typeof gatewayDecision !== 'boolean' && resultEvidence === undefined) {
    return undefined;
  }

  return {
    ...(typeof gatewayDecision === 'boolean' ? { gatewayDecision } : {}),
    ...(resultEvidence === undefined ? {} : { resultEvidence }),
  };
}

function buildFailedStepPayload(
  failureReason: string | undefined,
  error: string | undefined
): Record<string, unknown> | undefined {
  if (failureReason === undefined && error === undefined) {
    return undefined;
  }

  return {
    ...(failureReason === undefined ? {} : { reason: failureReason }),
    ...(error === undefined ? {} : { message: error }),
  };
}

function pruneGatewayDependencyFacts(
  gatewayDependencyFacts: Record<string, Record<string, unknown>>,
  retainedGatewayDependencyStepIds: ReadonlyArray<string>
): void {
  const retainedStepIds = new Set(retainedGatewayDependencyStepIds);
  for (const stepId of Object.keys(gatewayDependencyFacts)) {
    if (!retainedStepIds.has(stepId)) {
      delete gatewayDependencyFacts[stepId];
    }
  }
}
