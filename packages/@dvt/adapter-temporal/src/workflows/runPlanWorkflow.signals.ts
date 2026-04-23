/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.signals.ts
 * @baseline ADR-0007: Run Cancellation
 * @baseline ADR-0008: Signal Idempotency
 * @baseline ADR-0047: Runtime-Owned Realized Lifecycle For Signal-Driven Transitions
 * @decision Apply pause, resume, and cancel signals idempotently against runtime-owned workflow state
 * @consequence Duplicate control signals cannot create divergent lifecycle transitions
 * @version 1.2.0
 */
import { defineQuery, defineSignal, setHandler } from '@temporalio/workflow';

import type { RuntimeWorkflowState } from './runPlanWorkflow.types.js';

export const pauseSignal = defineSignal<[string]>('pause');
export const resumeSignal = defineSignal<[string]>('resume');
export const cancelSignal = defineSignal<[string, string | undefined]>('cancel');

const runtimeStateQuery = defineQuery<RuntimeWorkflowState>('runtimeState');

export function createInitialWorkflowState(
  continuedAsNewCount: number,
  gatewayDecisions: Record<string, boolean> | undefined
): RuntimeWorkflowState {
  return {
    status: 'RUNNING',
    paused: false,
    cancelRequested: false,
    currentStepIndex: 0,
    continuedAsNewCount,
    gatewayDecisions: gatewayDecisions ? { ...gatewayDecisions } : undefined,
  };
}

export function registerSignalHandlers(
  state: RuntimeWorkflowState,
  processedControlSignalIds: Set<string>
): void {
  setHandler(
    pauseSignal,
    createTransitionSignalHandler({
      state,
      processedControlSignalIds,
      shouldIgnoreSignal: shouldIgnorePauseSignal,
      applyTransition: markWorkflowPaused,
    })
  );
  setHandler(
    resumeSignal,
    createTransitionSignalHandler({
      state,
      processedControlSignalIds,
      shouldIgnoreSignal: shouldIgnoreResumeSignal,
      applyTransition: markWorkflowRunning,
    })
  );
  setHandler(cancelSignal, createCancelSignalHandler(state, processedControlSignalIds));

  setHandler(runtimeStateQuery, () => state);
}

function createTransitionSignalHandler(args: {
  state: RuntimeWorkflowState;
  processedControlSignalIds: Set<string>;
  shouldIgnoreSignal(
    state: RuntimeWorkflowState,
    processedControlSignalIds: Set<string>,
    signalId: string
  ): boolean;
  applyTransition(state: RuntimeWorkflowState): void;
}): (signalId: string) => void {
  return (signalId: string) => {
    if (args.shouldIgnoreSignal(args.state, args.processedControlSignalIds, signalId)) {
      return;
    }

    args.applyTransition(args.state);
  };
}

function markWorkflowPaused(state: RuntimeWorkflowState): void {
  state.paused = true;
  state.status = 'PAUSED';
}

function markWorkflowRunning(state: RuntimeWorkflowState): void {
  state.paused = false;
  state.status = 'RUNNING';
}

function createCancelSignalHandler(
  state: RuntimeWorkflowState,
  processedControlSignalIds: Set<string>
): (signalId: string, reason: string | undefined) => void {
  return (signalId: string, reason: string | undefined) => {
    if (shouldIgnoreCancelSignal(state, processedControlSignalIds, signalId)) {
      return;
    }

    state.cancelRequested = true;
    if (reason !== undefined) {
      state.cancelReason = reason;
    }
  };
}

const shouldIgnorePauseSignal = createSignalIgnorePolicy({
  shouldIgnoreAfterTracking: (state) => state.status !== 'RUNNING',
});

const shouldIgnoreResumeSignal = createSignalIgnorePolicy({
  shouldIgnoreAfterTracking: (state) => !state.paused,
});

const shouldIgnoreCancelSignal = createSignalIgnorePolicy({
  shouldIgnoreBeforeTracking: (state) => state.cancelRequested || isTerminalStatus(state.status),
});

function createSignalIgnorePolicy(args: {
  shouldIgnoreBeforeTracking?(state: RuntimeWorkflowState): boolean;
  shouldIgnoreAfterTracking?(state: RuntimeWorkflowState): boolean;
}): (
  state: RuntimeWorkflowState,
  processedControlSignalIds: Set<string>,
  signalId: string
) => boolean {
  return (
    state: RuntimeWorkflowState,
    processedControlSignalIds: Set<string>,
    signalId: string
  ): boolean =>
    shouldIgnoreControlSignal({
      signalId,
      processedControlSignalIds,
      shouldIgnoreBeforeTracking:
        args.shouldIgnoreBeforeTracking === undefined
          ? undefined
          : () => args.shouldIgnoreBeforeTracking?.(state) ?? false,
      shouldIgnoreAfterTracking:
        args.shouldIgnoreAfterTracking === undefined
          ? undefined
          : () => args.shouldIgnoreAfterTracking?.(state) ?? false,
    });
}

function shouldIgnoreControlSignal(args: {
  signalId: string;
  processedControlSignalIds: Set<string>;
  shouldIgnoreBeforeTracking?(): boolean;
  shouldIgnoreAfterTracking?(): boolean;
}): boolean {
  if (args.shouldIgnoreBeforeTracking?.() ?? false) {
    return true;
  }

  if (isDuplicateControlSignal(args.signalId, args.processedControlSignalIds)) {
    return true;
  }

  return args.shouldIgnoreAfterTracking?.() ?? false;
}

function isTerminalStatus(status: RuntimeWorkflowState['status']): boolean {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
}

function isDuplicateControlSignal(
  signalId: string,
  processedControlSignalIds: Set<string>
): boolean {
  if (processedControlSignalIds.has(signalId)) {
    return true;
  }
  processedControlSignalIds.add(signalId);
  return false;
}
