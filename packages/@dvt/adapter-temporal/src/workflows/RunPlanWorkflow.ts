/**
 * @file packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 5 — Workflow remains deterministic and delegates side effects to activities
 * @decision Section 3 — Lifecycle signaling/query handling follows canonical run state transitions
 * @consequence Temporal workflow execution is replay-safe and aligned with engine lifecycle contracts
 * @version 1.1.0
 * @date 2026-02-23
 */
/**
 * RunPlanWorkflow — Temporal interpreter workflow (deterministic).
 *
 * Runs inside a Temporal V8 sandbox.  Only imports from
 * `@temporalio/workflow` and type-only references are allowed.
 * `@dvt/plan-interpreter` is safe: pure functions, no Node.js APIs.
 *
 * Determinism rules enforced:
 *  - Zero `Date.now()` / `new Date()`
 *  - Zero `Math.random()`
 *  - Zero `process.env`
 *  - Zero Node.js / DOM APIs
 */
import { evaluateDslV1, parseDslV1 } from '@dvt/dsl';
import { planExecutionLayers } from '@dvt/plan-interpreter';
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
  gatewayDecisions?: Record<string, boolean>;
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
    gatewayDecisions: {},
  };

  const completedStepResults: Record<string, Record<string, unknown>> = {};
  const skippedSteps = new Set<string>();

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
        // Phase 1: always 1. Phase 2: planner supplies via workflow input on retry.
        logicalAttemptId: 1,
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
      const executableLayer = layer.filter((step) => {
        if (skippedSteps.has(step.stepId)) return false;
        const deps = normalizeDependsOn(step.dependsOn);
        return !deps.some((dep) => skippedSteps.has(dep));
      });

      for (const step of layer) {
        if (!executableLayer.some((candidate) => candidate.stepId === step.stepId)) {
          skippedSteps.add(step.stepId);
          await activities.emitEvent({
            ctx,
            planRef,
            eventType: 'StepSkipped',
            stepId: step.stepId,
          });
        }
      }

      if (executableLayer.length === 0) {
        processedLayersInCurrentExecution += 1;
        continue;
      }

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
      for (const step of executableLayer) {
        await activities.emitEvent({ ctx, planRef, eventType: 'StepStarted', stepId: step.stepId });
      }

      const layerResults = await Promise.all(
        executableLayer.map(async (step) => {
          try {
            if (step.type === 'gateway' && isGatewayConfig(step.gateway)) {
              const gatewayCtx = buildGatewayContext(step, completedStepResults);
              const parsed = parseDslV1(step.gateway.expression);
              const passed = evaluateDslV1(parsed, gatewayCtx);
              state.gatewayDecisions![step.stepId] = passed;

              if (!passed) {
                const downstream = collectDownstreamStepIds(plan.steps, step.stepId);
                for (const downstreamStepId of downstream) {
                  skippedSteps.add(downstreamStepId);
                }
              }

              return {
                stepId: step.stepId,
                result: { stepId: step.stepId, status: 'COMPLETED' as const },
              };
            }

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
          completedStepResults[stepId] = {
            status: 'COMPLETED',
            stepId,
          };
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

function normalizeDependsOn(dependsOn: unknown): string[] {
  if (!Array.isArray(dependsOn)) return [];
  return dependsOn.filter((d): d is string => typeof d === 'string' && d.trim().length > 0);
}

function isGatewayConfig(v: unknown): v is { dslVersion: '1.0'; expression: string } {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    c.dslVersion === '1.0' && typeof c.expression === 'string' && c.expression.trim().length > 0
  );
}

function buildGatewayContext(
  step: WorkflowStep,
  completedStepResults: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const deps = normalizeDependsOn(step.dependsOn);
  const fromDependency = deps[0] ? completedStepResults[deps[0]] : undefined;
  if (fromDependency) return fromDependency;
  return {};
}

function collectDownstreamStepIds(steps: WorkflowStep[], fromStepId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const step of steps) {
    for (const dep of normalizeDependsOn(step.dependsOn)) {
      const arr = childrenByParent.get(dep) ?? [];
      arr.push(step.stepId);
      childrenByParent.set(dep, arr);
    }
  }

  const visited = new Set<string>();
  const stack = [...(childrenByParent.get(fromStepId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const child of childrenByParent.get(current) ?? []) {
      if (!visited.has(child)) stack.push(child);
    }
  }
  return visited;
}
