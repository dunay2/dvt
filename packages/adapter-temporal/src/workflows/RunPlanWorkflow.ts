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

type WorkflowStep = Awaited<ReturnType<Activities['fetchPlan']>>['steps'][number];

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

    // 4. Walk steps in deterministic layers (sequential fallback when no DAG edges).
    const executionLayers = planExecutionLayers(plan.steps);
    let completedSteps = 0;
    for (const layer of executionLayers) {
      state.currentStepIndex = completedSteps;

      // Check cancellation before each layer
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

      // Emit StepStarted in stable order, then execute the whole layer.
      for (const step of layer) {
        await activities.emitEvent({ ctx, eventType: 'StepStarted', stepId: step.stepId });
      }

      const layerResults = await Promise.all(
        layer.map(async (step) => {
          const result = await activities.executeStep({ step, ctx });
          return { stepId: step.stepId, result };
        })
      );

      for (const { stepId, result } of layerResults) {
        if (result.status === 'COMPLETED') {
          await activities.emitEvent({ ctx, eventType: 'StepCompleted', stepId });
          completedSteps += 1;
          state.currentStepIndex = completedSteps;
          continue;
        }

        await activities.emitEvent({ ctx, eventType: 'StepFailed', stepId });
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

export function planExecutionLayers(steps: ReadonlyArray<WorkflowStep>): WorkflowStep[][] {
  if (steps.length === 0) {
    return [];
  }

  // Validate duplicate IDs upfront (applies to both DAG and sequential fallback paths).
  const seenStepIds = new Set<string>();
  for (const step of steps) {
    if (seenStepIds.has(step.stepId)) {
      throw new Error(`INVALID_PLAN_SCHEMA: duplicate_step_id:${step.stepId}`);
    }
    seenStepIds.add(step.stepId);
  }

  // Backward-compatible fallback for legacy plans without explicit dependencies.
  const hasExplicitDependencies = steps.some((step) => Array.isArray(step.dependsOn));
  if (!hasExplicitDependencies) {
    return steps.map((step) => [step]);
  }

  const byId = new Map<string, WorkflowStep>();
  const remainingDeps = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const step of steps) {
    byId.set(step.stepId, step);
    remainingDeps.set(step.stepId, 0);
    dependents.set(step.stepId, []);
  }

  for (const step of steps) {
    for (const dep of normalizeDependsOn(step)) {
      if (!byId.has(dep)) {
        throw new Error(`INVALID_PLAN_SCHEMA: unknown_dependency:${step.stepId}->${dep}`);
      }
      if (dep === step.stepId) {
        throw new Error(`INVALID_PLAN_SCHEMA: self_dependency:${step.stepId}`);
      }

      remainingDeps.set(step.stepId, (remainingDeps.get(step.stepId) ?? 0) + 1);
      const nextDependents = dependents.get(dep)!;
      nextDependents.push(step.stepId);
    }
  }

  const consumed = new Set<string>();
  const layers: WorkflowStep[][] = [];

  let ready = steps.filter((step) => (remainingDeps.get(step.stepId) ?? 0) === 0);

  while (ready.length > 0) {
    layers.push(ready);

    const nextReadyIds = new Set<string>();
    for (const step of ready) {
      consumed.add(step.stepId);
      for (const dependentId of dependents.get(step.stepId) ?? []) {
        const nextCount = (remainingDeps.get(dependentId) ?? 0) - 1;
        remainingDeps.set(dependentId, nextCount);
        if (nextCount === 0) {
          nextReadyIds.add(dependentId);
        }
      }
    }

    // Preserve declaration order inside the same frontier for deterministic history.
    ready = steps.filter((step) => nextReadyIds.has(step.stepId) && !consumed.has(step.stepId));
  }

  if (consumed.size !== steps.length) {
    throw new Error('INVALID_PLAN_SCHEMA: cyclic_dependencies_detected');
  }

  return layers;
}

function normalizeDependsOn(step: WorkflowStep): string[] {
  if (!Array.isArray(step.dependsOn)) {
    return [];
  }

  const deduped = new Set<string>();
  for (const dep of step.dependsOn) {
    if (typeof dep !== 'string' || dep.length === 0) {
      throw new Error(`INVALID_PLAN_SCHEMA: invalid_dependency_value:${step.stepId}`);
    }
    deduped.add(dep);
  }

  return [...deduped];
}
