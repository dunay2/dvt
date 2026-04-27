/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.cancellation.ts
 * @ownedConcern Runtime-owned cancellation lifecycle settlement
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0007: Run Cancellation
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Finalize pause, resume, and cancellation transitions through canonical run events emitted from workflow lifecycle control
 * @consequence Operator cancellation remains observable without making Temporal the semantic lifecycle authority
 * @version 1.2.0
 */
import { CancellationScope, condition, isCancellation } from '@temporalio/workflow';

import { eventActivities, terminalEventActivities } from './runPlanWorkflow.activities.js';
import type {
  RunPlanWorkflowResult,
  RuntimeWorkflowState,
  WorkflowCtx,
  WorkflowPlanRef,
} from './runPlanWorkflow.types.js';

interface CancellationArgs {
  state: RuntimeWorkflowState;
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  continuedAsNewCount: number;
}

export async function handlePreLayerLifecycle(
  args: CancellationArgs
): Promise<RunPlanWorkflowResult | null> {
  const cancelled = await finalizeCancellationIfRequested(args);
  if (cancelled) {
    return cancelled;
  }

  if (!args.state.paused) {
    return null;
  }

  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'RunPaused',
  });
  await condition(() => !args.state.paused || args.state.cancelRequested);

  const cancelledWhilePaused = await finalizeCancellationIfRequested(args);
  if (cancelledWhilePaused) {
    return cancelledWhilePaused;
  }

  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'RunResumed',
  });
  return null;
}

export async function finalizeCancellationIfRequested(
  args: CancellationArgs
): Promise<RunPlanWorkflowResult | null> {
  if (!args.state.cancelRequested) {
    return null;
  }

  return CancellationScope.nonCancellable(async () => {
    return emitTerminalCancellation(args, { includeRequestEvent: true });
  });
}

export async function finalizeNativeCancellationIfNeeded(
  args: CancellationArgs & {
    error: unknown;
  }
): Promise<boolean> {
  if (!isCancellation(args.error)) {
    return false;
  }

  await CancellationScope.nonCancellable(async () => {
    await emitTerminalCancellation(args, { includeRequestEvent: !args.state.cancelRequested });
  });
  return true;
}

async function emitTerminalCancellation(
  args: CancellationArgs,
  options: { includeRequestEvent: boolean }
): Promise<RunPlanWorkflowResult> {
  args.state.cancelRequested = true;
  args.state.paused = false;
  args.state.status = 'CANCELLED';

  if (options.includeRequestEvent) {
    await terminalEventActivities.emitEvent({
      ctx: args.ctx,
      planRef: args.planRef,
      eventType: 'RunCancelRequested',
    });
  }

  await terminalEventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'RunCancelled',
  });

  return {
    runId: args.ctx.runId,
    status: 'CANCELLED',
    continuedAsNewCount: args.continuedAsNewCount,
  };
}
