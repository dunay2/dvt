/**
 * RunPlanWorkflow — Temporal interpreter workflow (deterministic).
 *
 * Runs inside a Temporal V8 sandbox.  Only imports from
 * `@temporalio/workflow` and type-only references are allowed.
 *
 * Determinism rules enforced:
 *  - Zero `Date.now()` / `new Date()`
 *  - Zero `Math.random()`
 *  - Zero `process.env`
 *  - Zero Node.js / DOM APIs
 */
import {
  condition,
  defineQuery,
  defineSignal,
  proxyActivities,
  setHandler,
} from '@temporalio/workflow';

import type { Activities } from '../activities/stepActivities.js';

// ---------------------------------------------------------------------------
// Workflow input / output
// ---------------------------------------------------------------------------

export interface RunPlanWorkflowInput {
  planRef: {
    uri: string;
    sha256: string;
    schemaVersion: string;
    planId: string;
    planVersion: string;
    sizeBytes?: number;
    expiresAt?: string;
  };
  ctx: {
    tenantId: string;
    projectId: string;
    environmentId: string;
    runId: string;
    targetAdapter: 'temporal' | 'conductor' | 'mock';
  };
}

export interface RunPlanWorkflowResult {
  runId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

// ---------------------------------------------------------------------------
// Workflow state (visible via query)
// ---------------------------------------------------------------------------

export interface WorkflowState {
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paused: boolean;
  cancelled: boolean;
  cancelReason?: string;
  currentStepIndex: number;
}

// ---------------------------------------------------------------------------
// Signals & queries
// ---------------------------------------------------------------------------

export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');
export const cancelSignal = defineSignal<[string]>('cancel');
export const statusQuery = defineQuery<WorkflowState>('status');

// ---------------------------------------------------------------------------
// Activity proxy (all side-effects delegated to activities)
// ---------------------------------------------------------------------------

const activities = proxyActivities<Activities>({
  startToCloseTimeout: '30m',
  retry: {
    initialInterval: '1s',
    maximumInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

// ---------------------------------------------------------------------------
// Workflow implementation
// ---------------------------------------------------------------------------

export async function runPlanWorkflow(input: RunPlanWorkflowInput): Promise<RunPlanWorkflowResult> {
  const { planRef, ctx } = input;

  const state: WorkflowState = {
    status: 'RUNNING',
    paused: false,
    cancelled: false,
    currentStepIndex: 0,
  };

  // -- signal handlers ------------------------------------------------
  setHandler(pauseSignal, () => {
    if (state.status === 'RUNNING') {
      state.paused = true;
      state.status = 'PAUSED';
    }
  });

  setHandler(resumeSignal, () => {
    if (state.paused) {
      state.paused = false;
      state.status = 'RUNNING';
    }
  });

  setHandler(cancelSignal, (reason: string) => {
    state.cancelled = true;
    state.cancelReason = reason;
    state.status = 'CANCELLED';
  });

  setHandler(statusQuery, () => state);

  // -- main orchestration ---------------------------------------------
  try {
    // 1. Persist run metadata
    await activities.saveRunMetadata({
      tenantId: ctx.tenantId,
      projectId: ctx.projectId,
      environmentId: ctx.environmentId,
      runId: ctx.runId,
      provider: 'temporal',
      providerWorkflowId: ctx.runId,
      providerRunId: ctx.runId,
    });

    // 2. Emit RunStarted
    await activities.emitEvent({ ctx, eventType: 'RunStarted' });

    // 3. Fetch & validate plan via activity
    const plan = await activities.fetchPlan(planRef);

    // 4. Walk steps sequentially
    for (let i = 0; i < plan.steps.length; i++) {
      state.currentStepIndex = i;
      const step = plan.steps[i]!;

      // Check cancellation before each step
      if (state.cancelled) {
        await activities.emitEvent({ ctx, eventType: 'RunCancelled' });
        state.status = 'CANCELLED';
        return { runId: ctx.runId, status: 'CANCELLED' };
      }

      // Block while paused
      if (state.paused) {
        await activities.emitEvent({ ctx, eventType: 'RunPaused' });
        await condition(() => !state.paused || state.cancelled);

        if (state.cancelled) {
          await activities.emitEvent({ ctx, eventType: 'RunCancelled' });
          state.status = 'CANCELLED';
          return { runId: ctx.runId, status: 'CANCELLED' };
        }

        await activities.emitEvent({ ctx, eventType: 'RunResumed' });
      }

      // Execute step
      await activities.emitEvent({ ctx, eventType: 'StepStarted', stepId: step.stepId });

      const result = await activities.executeStep({ step, ctx });

      if (result.status === 'COMPLETED') {
        await activities.emitEvent({ ctx, eventType: 'StepCompleted', stepId: step.stepId });
      } else {
        await activities.emitEvent({ ctx, eventType: 'StepFailed', stepId: step.stepId });
        await activities.emitEvent({ ctx, eventType: 'RunFailed' });
        state.status = 'FAILED';
        return { runId: ctx.runId, status: 'FAILED' };
      }
    }

    // 5. All steps completed
    await activities.emitEvent({ ctx, eventType: 'RunCompleted' });
    state.status = 'COMPLETED';
    return { runId: ctx.runId, status: 'COMPLETED' };
  } catch (err) {
    // Unexpected error — emit RunFailed if not already terminal
    if (state.status !== 'CANCELLED' && state.status !== 'FAILED') {
      try {
        await activities.emitEvent({ ctx, eventType: 'RunFailed' });
      } catch {
        // best-effort; do not mask the original error
      }
      state.status = 'FAILED';
    }
    throw err;
  }
}
