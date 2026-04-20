import type { MaterializationEvidence } from '@dvt/contracts';
import { continueAsNew, sleep } from '@temporalio/workflow';

import { eventActivities } from './runPlanWorkflow.activities.js';
import { finalizeCancellationIfRequested } from './runPlanWorkflow.cancellation.js';
import type {
  LayerLoopOutcome,
  RunPlanWorkflowInput,
  RunPlanWorkflowResult,
  RuntimeWorkflowState,
  WorkflowCtx,
  WorkflowPlanRef,
} from './runPlanWorkflow.types.js';

export async function resolveLayerLoopOutcome(args: {
  layerOutcome: LayerLoopOutcome;
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  state: RuntimeWorkflowState;
  continuedAsNewCount: number;
  runtimeExecutor?: 'postgres' | 'dbt';
  latestResultEvidence?: MaterializationEvidence;
}): Promise<RunPlanWorkflowResult> {
  if (args.layerOutcome.kind === 'terminal') {
    return args.layerOutcome.result;
  }

  const cancelledOutcome = await resolveCancelledLayerLoopOutcome(args);
  if (cancelledOutcome) {
    return cancelledOutcome;
  }

  if (args.layerOutcome.kind === 'continue_as_new') {
    return continueAsNew<RunPlanWorkflowContinueAsNew>(args.layerOutcome.nextInput);
  }

  return completeRunAfterLayerLoop(args);
}

async function resolveCancelledLayerLoopOutcome(args: {
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  state: RuntimeWorkflowState;
  continuedAsNewCount: number;
}): Promise<RunPlanWorkflowResult | null> {
  const cancelled = await finalizeCancellationIfRequested(args);
  if (cancelled) {
    return cancelled;
  }

  await sleep(1);
  return finalizeCancellationIfRequested(args);
}

async function completeRunAfterLayerLoop(args: {
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  state: RuntimeWorkflowState;
  continuedAsNewCount: number;
  runtimeExecutor?: 'postgres' | 'dbt';
  latestResultEvidence?: MaterializationEvidence;
}): Promise<RunPlanWorkflowResult> {
  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'RunCompleted',
    ...toOptionalPayload(buildRunCompletedPayload(args.runtimeExecutor, args.latestResultEvidence)),
  });
  args.state.status = 'COMPLETED';

  return {
    runId: args.ctx.runId,
    status: 'COMPLETED',
    continuedAsNewCount: args.continuedAsNewCount,
  };
}

type RunPlanWorkflowContinueAsNew = (input: RunPlanWorkflowInput) => Promise<RunPlanWorkflowResult>;

function buildRunCompletedPayload(
  runtimeExecutor: 'postgres' | 'dbt' | undefined,
  latestResultEvidence: MaterializationEvidence | undefined
): Record<string, unknown> | undefined {
  if (runtimeExecutor === undefined && latestResultEvidence === undefined) {
    return undefined;
  }

  return {
    ...(runtimeExecutor === undefined ? {} : { executor: runtimeExecutor }),
    ...(latestResultEvidence === undefined ? {} : { resultEvidence: latestResultEvidence }),
  };
}

function toOptionalPayload(payload: Record<string, unknown> | undefined): {
  payload?: Record<string, unknown>;
} {
  return payload === undefined ? {} : { payload };
}

export async function markWorkflowFailedIfNeeded(
  state: RuntimeWorkflowState,
  ctx: WorkflowCtx,
  planRef: WorkflowPlanRef,
  runtimeExecutor?: 'postgres' | 'dbt'
): Promise<void> {
  if (state.status === 'CANCELLED' || state.status === 'FAILED') {
    return;
  }

  try {
    await eventActivities.emitEvent({
      ctx,
      planRef,
      eventType: 'RunFailed',
      payload: {
        reason: 'WORKFLOW_FAILURE',
        ...(runtimeExecutor === undefined ? {} : { executor: runtimeExecutor }),
      },
    });
  } catch {
    // Best-effort only; do not mask the original error.
  }

  state.status = 'FAILED';
}

export async function bootstrapFirstExecutionIfNeeded(
  nextLayerIndex: number,
  ctx: WorkflowCtx,
  planRef: WorkflowPlanRef,
  runtimeExecutor?: 'postgres' | 'dbt'
): Promise<void> {
  if (nextLayerIndex !== 0) {
    return;
  }

  await eventActivities.emitEvent({
    ctx,
    planRef,
    eventType: 'RunStarted',
    ...(runtimeExecutor === undefined ? {} : { payload: { executor: runtimeExecutor } }),
  });
}
