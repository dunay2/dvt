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
  ApplicationFailure,
  continueAsNew,
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
  /** Number of layers to process before continue-as-new (`0` disables rollover). */
  continueAsNewAfterLayerCount?: number;
  /** Internal resume cursor used across continue-as-new executions. */
  resumeFromLayerIndex?: number;
  /** Internal cumulative counter used for observability and test assertions. */
  continuedAsNewCount?: number;
}

export interface RunPlanWorkflowResult {
  runId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  continuedAsNewCount: number;
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
  continuedAsNewCount: number;
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
    maximumInterval: '60s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['PermanentStepError'],
  },
});

// ---------------------------------------------------------------------------
// Workflow implementation
// ---------------------------------------------------------------------------

export async function runPlanWorkflow(input: RunPlanWorkflowInput): Promise<RunPlanWorkflowResult> {
  const { planRef, ctx } = input;
  const continueAsNewAfterLayerCount = normalizeNonNegativeInt(input.continueAsNewAfterLayerCount);
  const resumeFromLayerIndex = normalizeNonNegativeInt(input.resumeFromLayerIndex);
  const continuedAsNewCount = normalizeNonNegativeInt(input.continuedAsNewCount);

  const state: WorkflowState = {
    status: 'RUNNING',
    paused: false,
    cancelled: false,
    currentStepIndex: 0,
    continuedAsNewCount,
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
    // 1. Persist run metadata + RunStarted only in first execution.
    if (resumeFromLayerIndex === 0) {
      await activities.saveRunMetadata({
        tenantId: ctx.tenantId,
        projectId: ctx.projectId,
        environmentId: ctx.environmentId,
        runId: ctx.runId,
        planId: planRef.planId,
        planVersion: planRef.planVersion,
        provider: 'temporal',
        providerWorkflowId: ctx.runId,
        providerRunId: ctx.runId,
      });

      await activities.emitEvent({ ctx, planRef, eventType: 'RunStarted' });
    }

    // 2. Fetch & validate plan via activity
    const plan = await activities.fetchPlan(planRef);

    // 3. Walk steps in deterministic layers (sequential fallback when no DAG edges).
    const executionLayers = planExecutionLayers(plan.steps);
    if (resumeFromLayerIndex > executionLayers.length) {
      throw new Error('INVALID_WORKFLOW_STATE: resumeFromLayerIndex_out_of_range');
    }

    let completedSteps = countStepsBeforeLayer(executionLayers, resumeFromLayerIndex);
    state.currentStepIndex = completedSteps;

    let processedLayersInCurrentExecution = 0;

    for (
      let layerIndex = resumeFromLayerIndex;
      layerIndex < executionLayers.length;
      layerIndex += 1
    ) {
      const layer = executionLayers[layerIndex]!;
      state.currentStepIndex = completedSteps;

      // Check cancellation before each layer
      if (state.cancelled) {
        await activities.emitEvent({ ctx, planRef, eventType: 'RunCancelled' });
        state.status = 'CANCELLED';
        return { runId: ctx.runId, status: 'CANCELLED', continuedAsNewCount };
      }

      // Block while paused
      if (state.paused) {
        await activities.emitEvent({ ctx, planRef, eventType: 'RunPaused' });
        await condition(() => !state.paused || state.cancelled);

        if (state.cancelled) {
          await activities.emitEvent({ ctx, planRef, eventType: 'RunCancelled' });
          state.status = 'CANCELLED';
          return { runId: ctx.runId, status: 'CANCELLED', continuedAsNewCount };
        }

        await activities.emitEvent({ ctx, planRef, eventType: 'RunResumed' });
      }

      // Emit StepStarted in stable order, then execute the whole layer.
      for (const step of layer) {
        await activities.emitEvent({ ctx, planRef, eventType: 'StepStarted', stepId: step.stepId });
      }

      const layerResults = await Promise.all(
        layer.map(async (step) => {
          try {
            const result = await activities.executeStep({ step, ctx });
            return { stepId: step.stepId, result };
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const retriable = !(error instanceof ApplicationFailure) || error.nonRetryable !== true;
            const result = {
              stepId: step.stepId,
              status: 'FAILED' as const,
              retriable,
              error: err.message,
            };
            return { stepId: step.stepId, result };
          }
        })
      );

      for (const { stepId, result } of layerResults) {
        if (result.status === 'COMPLETED') {
          await activities.emitEvent({ ctx, planRef, eventType: 'StepCompleted', stepId });
          completedSteps += 1;
          state.currentStepIndex = completedSteps;
          continue;
        }

        await activities.emitEvent({ ctx, planRef, eventType: 'StepFailed', stepId });
        await activities.emitEvent({ ctx, planRef, eventType: 'RunFailed' });
        state.status = 'FAILED';
        return { runId: ctx.runId, status: 'FAILED', continuedAsNewCount };
      }

      processedLayersInCurrentExecution += 1;
      const nextLayerIndex = layerIndex + 1;

      if (
        shouldTriggerContinueAsNew({
          continueAsNewAfterLayerCount,
          processedLayersInCurrentExecution,
          nextLayerIndex,
          totalLayerCount: executionLayers.length,
        })
      ) {
        return continueAsNew<typeof runPlanWorkflow>({
          ...input,
          continueAsNewAfterLayerCount,
          resumeFromLayerIndex: nextLayerIndex,
          continuedAsNewCount: continuedAsNewCount + 1,
        });
      }
    }

    // 4. All steps completed
    await activities.emitEvent({ ctx, planRef, eventType: 'RunCompleted' });
    state.status = 'COMPLETED';
    return { runId: ctx.runId, status: 'COMPLETED', continuedAsNewCount };
  } catch (err) {
    // Unexpected error — emit RunFailed if not already terminal
    if (state.status !== 'CANCELLED' && state.status !== 'FAILED') {
      try {
        await activities.emitEvent({ ctx, planRef, eventType: 'RunFailed' });
      } catch {
        // best-effort; do not mask the original error
      }
      state.status = 'FAILED';
    }
    throw err;
  }
}

export function shouldTriggerContinueAsNew(args: {
  continueAsNewAfterLayerCount: number;
  processedLayersInCurrentExecution: number;
  nextLayerIndex: number;
  totalLayerCount: number;
}): boolean {
  if (args.continueAsNewAfterLayerCount <= 0) {
    return false;
  }

  if (args.processedLayersInCurrentExecution < args.continueAsNewAfterLayerCount) {
    return false;
  }

  // No rollover if there are no pending layers.
  if (args.nextLayerIndex >= args.totalLayerCount) {
    return false;
  }

  return true;
}

function countStepsBeforeLayer(
  layers: ReadonlyArray<ReadonlyArray<WorkflowStep>>,
  layerIndex: number
): number {
  let total = 0;
  for (let i = 0; i < layerIndex; i += 1) {
    total += layers[i]?.length ?? 0;
  }
  return total;
}

function normalizeNonNegativeInt(value: unknown): number {
  if (isNonNegativeInteger(value)) {
    return value as number;
  }

  if (isNonNegativeIntegerString(value)) {
    return Number(value);
  }

  return 0;
}

function isNonNegativeInteger(val: unknown): boolean {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0;
}

function isNonNegativeIntegerString(val: unknown): boolean {
  if (typeof val !== 'string' || val.trim().length === 0) {
    return false;
  }
  const n = Number(val);
  return Number.isInteger(n) && n >= 0;
}

export function planExecutionLayers(steps: ReadonlyArray<WorkflowStep>): WorkflowStep[][] {
  if (steps.length === 0) return [];

  validateNoDuplicateStepIds(steps);

  if (!hasExplicitDependencies(steps)) {
    return steps.map((step) => [step]);
  }

  const { remainingDeps, dependents } = buildDagMaps(steps);

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
    ready = steps.filter((step) => nextReadyIds.has(step.stepId) && !consumed.has(step.stepId));
  }

  if (consumed.size !== steps.length) {
    throw new Error('INVALID_PLAN_SCHEMA: cyclic_dependencies_detected');
  }

  return layers;
}

function validateNoDuplicateStepIds(steps: ReadonlyArray<WorkflowStep>): void {
  const seenStepIds = new Set<string>();
  for (const step of steps) {
    if (seenStepIds.has(step.stepId)) {
      throw new Error(`INVALID_PLAN_SCHEMA: duplicate_step_id:${step.stepId}`);
    }
    seenStepIds.add(step.stepId);
  }
}

function hasExplicitDependencies(steps: ReadonlyArray<WorkflowStep>): boolean {
  return steps.some((step) => Array.isArray(step.dependsOn));
}

function buildDagMaps(steps: ReadonlyArray<WorkflowStep>): {
  remainingDeps: Map<string, number>;
  dependents: Map<string, string[]>;
} {
  const remainingDeps = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const step of steps) {
    remainingDeps.set(step.stepId, 0);
    dependents.set(step.stepId, []);
  }

  const stepIds = new Set(steps.map((step) => step.stepId));
  for (const step of steps) {
    for (const dep of normalizeDependsOn(step)) {
      if (!stepIds.has(dep)) {
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
  return { remainingDeps, dependents };
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
