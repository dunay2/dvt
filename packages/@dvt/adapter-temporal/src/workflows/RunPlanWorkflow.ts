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
  /** Internal gateway decision map carried across continue-as-new rollovers. */
  gatewayDecisions?: Record<string, boolean>;
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

  const state = createInitialWorkflowState(input, continuedAsNewCount);

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
    await emitRunStartedIfNeeded({ ctx, planRef, resumeFromLayerIndex });

    // 2. Fetch & validate plan via activity
    const plan = await activities.fetchPlan(planRef);

    // 3. Walk steps in deterministic layers (sequential fallback when no DAG edges).
    const executionLayers = planExecutionLayers<WorkflowStep>(plan.steps);
    ensureResumeLayerIndexInRange(resumeFromLayerIndex, executionLayers.length);
    const layerProcessing = await processExecutionLayers({
      input,
      plan,
      planRef,
      ctx,
      state,
      executionLayers,
      resumeFromLayerIndex,
      continueAsNewAfterLayerCount,
      continuedAsNewCount,
      completedStepResults,
      skippedSteps,
    });

    if (layerProcessing.continueAsNewInput) {
      return continueAsNew<typeof runPlanWorkflow>(layerProcessing.continueAsNewInput);
    }

    if (layerProcessing.terminalResult) {
      return layerProcessing.terminalResult;
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

export function buildContinueAsNewInput(args: {
  input: RunPlanWorkflowInput;
  continueAsNewAfterLayerCount: number;
  nextLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
}): RunPlanWorkflowInput {
  return {
    ...args.input,
    continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
    resumeFromLayerIndex: args.nextLayerIndex,
    continuedAsNewCount: args.continuedAsNewCount + 1,
    gatewayDecisions: { ...args.gatewayDecisions },
  };
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

function createInitialWorkflowState(
  input: RunPlanWorkflowInput,
  continuedAsNewCount: number
): WorkflowState {
  return {
    status: 'RUNNING',
    paused: false,
    cancelled: false,
    currentStepIndex: 0,
    continuedAsNewCount,
    gatewayDecisions: input.gatewayDecisions ? { ...input.gatewayDecisions } : undefined,
  };
}

async function emitRunStartedIfNeeded(args: {
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  resumeFromLayerIndex: number;
}): Promise<void> {
  if (args.resumeFromLayerIndex !== 0) {
    return;
  }

  await activities.saveRunMetadata({
    tenantId: args.ctx.tenantId,
    projectId: args.ctx.projectId,
    environmentId: args.ctx.environmentId,
    runId: args.ctx.runId,
    planId: args.planRef.planId,
    planVersion: args.planRef.planVersion,
    // Phase 1: always 1. Phase 2: planner supplies via workflow input on retry.
    logicalAttemptId: 1,
    provider: 'temporal',
    providerWorkflowId: args.ctx.runId,
    providerRunId: args.ctx.runId,
  });

  await activities.emitEvent({ ctx: args.ctx, planRef: args.planRef, eventType: 'RunStarted' });
}

function ensureResumeLayerIndexInRange(
  resumeFromLayerIndex: number,
  totalLayerCount: number
): void {
  if (resumeFromLayerIndex > totalLayerCount) {
    throw new Error('INVALID_WORKFLOW_STATE: resumeFromLayerIndex_out_of_range');
  }
}

type LayerExecutionResult = {
  stepId: string;
  gatewayDecision?: boolean;
  result: {
    stepId: string;
    status: 'COMPLETED' | 'FAILED';
    retriable?: boolean;
    error?: string;
  };
};

type ProcessExecutionLayersArgs = {
  input: RunPlanWorkflowInput;
  plan: Awaited<ReturnType<Activities['fetchPlan']>>;
  planRef: RunPlanWorkflowInput['planRef'];
  ctx: RunPlanWorkflowInput['ctx'];
  state: WorkflowState;
  executionLayers: ReadonlyArray<ReadonlyArray<WorkflowStep>>;
  resumeFromLayerIndex: number;
  continueAsNewAfterLayerCount: number;
  continuedAsNewCount: number;
  completedStepResults: Record<string, Record<string, unknown>>;
  skippedSteps: Set<string>;
};

type ProcessExecutionLayersResult = {
  terminalResult?: RunPlanWorkflowResult;
  continueAsNewInput?: RunPlanWorkflowInput;
};

async function processExecutionLayers(
  args: ProcessExecutionLayersArgs
): Promise<ProcessExecutionLayersResult> {
  let processedLayersInCurrentExecution = 0;
  let completedSteps = countStepsBeforeLayer(args.executionLayers, args.resumeFromLayerIndex);
  args.state.currentStepIndex = completedSteps;

  for (
    let layerIndex = args.resumeFromLayerIndex;
    layerIndex < args.executionLayers.length;
    layerIndex += 1
  ) {
    const layer = args.executionLayers[layerIndex]!;
    const executableLayer = buildExecutableLayer(layer, args.skippedSteps);
    await emitSkippedSteps({
      layer,
      executableLayer,
      skippedSteps: args.skippedSteps,
      ctx: args.ctx,
      planRef: args.planRef,
    });

    if (executableLayer.length === 0) {
      processedLayersInCurrentExecution += 1;
      continue;
    }

    args.state.currentStepIndex = completedSteps;

    const controlOutcome = await handleLayerControlState({
      state: args.state,
      ctx: args.ctx,
      planRef: args.planRef,
      continuedAsNewCount: args.continuedAsNewCount,
    });
    if (controlOutcome) {
      return { terminalResult: controlOutcome };
    }

    await emitStepStartedForLayer(executableLayer, args.ctx, args.planRef);

    const layerResults = await executeLayerSteps({
      layer: executableLayer,
      ctx: args.ctx,
      planSteps: args.plan.steps,
      completedStepResults: args.completedStepResults,
      state: args.state,
      skippedSteps: args.skippedSteps,
    });

    const persisted = await persistLayerResults({
      layerResults,
      ctx: args.ctx,
      planRef: args.planRef,
      completedStepResults: args.completedStepResults,
      continuedAsNewCount: args.continuedAsNewCount,
    });
    if (persisted.terminalResult) {
      args.state.status = persisted.terminalResult.status;
      return { terminalResult: persisted.terminalResult };
    }

    completedSteps += persisted.completedCount;
    args.state.currentStepIndex = completedSteps;
    processedLayersInCurrentExecution += 1;

    const nextLayerIndex = layerIndex + 1;
    if (
      shouldTriggerContinueAsNew({
        continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
        processedLayersInCurrentExecution,
        nextLayerIndex,
        totalLayerCount: args.executionLayers.length,
      })
    ) {
      return {
        continueAsNewInput: buildContinueAsNewInput({
          input: args.input,
          continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
          nextLayerIndex,
          continuedAsNewCount: args.continuedAsNewCount,
          gatewayDecisions: args.state.gatewayDecisions ?? {},
        }),
      };
    }
  }

  return {};
}

function buildExecutableLayer(
  layer: ReadonlyArray<WorkflowStep>,
  skippedSteps: Set<string>
): WorkflowStep[] {
  return layer.filter((step) => {
    if (skippedSteps.has(step.stepId)) {
      return false;
    }
    const deps = normalizeDependsOn(step.dependsOn);
    return !deps.some((dep) => skippedSteps.has(dep));
  });
}

async function emitSkippedSteps(args: {
  layer: ReadonlyArray<WorkflowStep>;
  executableLayer: ReadonlyArray<WorkflowStep>;
  skippedSteps: Set<string>;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
}): Promise<void> {
  for (const step of args.layer) {
    const isExecutable = args.executableLayer.some((candidate) => candidate.stepId === step.stepId);
    if (isExecutable) {
      continue;
    }

    args.skippedSteps.add(step.stepId);
    await activities.emitEvent({
      ctx: args.ctx,
      planRef: args.planRef,
      eventType: 'StepSkipped',
      stepId: step.stepId,
    });
  }
}

async function handleLayerControlState(args: {
  state: WorkflowState;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  continuedAsNewCount: number;
}): Promise<RunPlanWorkflowResult | undefined> {
  if (args.state.cancelled) {
    return emitCancelledResult(
      args.ctx.runId,
      args.ctx,
      args.planRef,
      args.state,
      args.continuedAsNewCount
    );
  }

  if (!args.state.paused) {
    return undefined;
  }

  await activities.emitEvent({ ctx: args.ctx, planRef: args.planRef, eventType: 'RunPaused' });
  await condition(() => !args.state.paused || args.state.cancelled);

  if (args.state.cancelled) {
    return emitCancelledResult(
      args.ctx.runId,
      args.ctx,
      args.planRef,
      args.state,
      args.continuedAsNewCount
    );
  }

  await activities.emitEvent({ ctx: args.ctx, planRef: args.planRef, eventType: 'RunResumed' });
  return undefined;
}

async function emitCancelledResult(
  runId: string,
  ctx: RunPlanWorkflowInput['ctx'],
  planRef: RunPlanWorkflowInput['planRef'],
  state: WorkflowState,
  continuedAsNewCount: number
): Promise<RunPlanWorkflowResult> {
  await activities.emitEvent({ ctx, planRef, eventType: 'RunCancelled' });
  state.status = 'CANCELLED';
  return { runId, status: 'CANCELLED', continuedAsNewCount };
}

async function emitStepStartedForLayer(
  layer: ReadonlyArray<WorkflowStep>,
  ctx: RunPlanWorkflowInput['ctx'],
  planRef: RunPlanWorkflowInput['planRef']
): Promise<void> {
  for (const step of layer) {
    const stepStartedPayload = buildStepStartedPayload(step);
    await activities.emitEvent({
      ctx,
      planRef,
      eventType: 'StepStarted',
      stepId: step.stepId,
      ...(stepStartedPayload ? { payload: stepStartedPayload } : {}),
    });
  }
}

async function executeLayerSteps(args: {
  layer: ReadonlyArray<WorkflowStep>;
  ctx: RunPlanWorkflowInput['ctx'];
  planSteps: ReadonlyArray<WorkflowStep>;
  completedStepResults: Record<string, Record<string, unknown>>;
  state: WorkflowState;
  skippedSteps: Set<string>;
}): Promise<LayerExecutionResult[]> {
  return Promise.all(
    args.layer.map(async (step) => {
      try {
        const gatewayContext =
          step.type === 'gateway'
            ? buildGatewayContext(step, args.completedStepResults)
            : undefined;
        const result = await activities.executeStep({
          step,
          ctx: args.ctx,
          ...(gatewayContext ? { gatewayContext } : {}),
        });

        const gatewayDecision =
          step.type === 'gateway' && typeof result.gatewayDecision === 'boolean'
            ? result.gatewayDecision
            : undefined;

        applyGatewayDecision({
          gatewayDecision,
          stepId: step.stepId,
          state: args.state,
          skippedSteps: args.skippedSteps,
          planSteps: args.planSteps,
        });

        return { stepId: step.stepId, gatewayDecision, result };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return {
          stepId: step.stepId,
          result: {
            stepId: step.stepId,
            status: 'FAILED' as const,
            retriable: !(error instanceof ApplicationFailure) || error.nonRetryable !== true,
            error: err.message,
          },
        };
      }
    })
  );
}

function applyGatewayDecision(args: {
  gatewayDecision: boolean | undefined;
  stepId: string;
  state: WorkflowState;
  skippedSteps: Set<string>;
  planSteps: ReadonlyArray<WorkflowStep>;
}): void {
  if (typeof args.gatewayDecision !== 'boolean') {
    return;
  }

  args.state.gatewayDecisions = {
    ...(args.state.gatewayDecisions ?? {}),
    [args.stepId]: args.gatewayDecision,
  };

  if (args.gatewayDecision) {
    return;
  }

  const downstream = collectDownstreamStepIds(args.planSteps, args.stepId);
  for (const downstreamStepId of downstream) {
    args.skippedSteps.add(downstreamStepId);
  }
}

async function persistLayerResults(args: {
  layerResults: LayerExecutionResult[];
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  completedStepResults: Record<string, Record<string, unknown>>;
  continuedAsNewCount: number;
}): Promise<{ completedCount: number; terminalResult?: RunPlanWorkflowResult }> {
  let completedCount = 0;

  for (const { stepId, result, gatewayDecision } of args.layerResults) {
    if (result.status !== 'COMPLETED') {
      await activities.emitEvent({
        ctx: args.ctx,
        planRef: args.planRef,
        eventType: 'StepFailed',
        stepId,
      });
      await activities.emitEvent({ ctx: args.ctx, planRef: args.planRef, eventType: 'RunFailed' });
      return {
        completedCount,
        terminalResult: {
          runId: args.ctx.runId,
          status: 'FAILED',
          continuedAsNewCount: args.continuedAsNewCount,
        },
      };
    }

    const completedPayload = typeof gatewayDecision === 'boolean' ? { gatewayDecision } : undefined;
    await activities.emitEvent({
      ctx: args.ctx,
      planRef: args.planRef,
      eventType: 'StepCompleted',
      stepId,
      ...(completedPayload ? { payload: completedPayload } : {}),
    });
    args.completedStepResults[stepId] = { status: 'COMPLETED', stepId };
    completedCount += 1;
  }

  return { completedCount };
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

export function buildStepStartedPayload(step: WorkflowStep): Record<string, unknown> | undefined {
  const stepTypeConfig = readRecord(step['stepTypeConfig']);
  if (!stepTypeConfig) {
    return undefined;
  }

  const compiledCodeRef = parseCompiledCodeRef(stepTypeConfig['compiledCodeRef']);
  if (!compiledCodeRef) {
    return undefined;
  }

  return { compiledCodeRef };
}

function parseCompiledCodeRef(value: unknown):
  | {
      sha256: string;
      storageUri: string;
      sizeBytes: number;
      encoding?: 'utf-8';
    }
  | undefined {
  const ref = readRecord(value);
  if (!ref) {
    return undefined;
  }

  const sha256 = readNonEmptyString(ref['sha256']);
  const storageUri = readNonEmptyString(ref['storageUri']);
  const sizeBytes = readNonNegativeInteger(ref['sizeBytes']);
  if (!sha256 || !storageUri || sizeBytes === undefined) {
    return undefined;
  }

  const encoding = ref['encoding'];
  if (encoding !== undefined && encoding !== 'utf-8') {
    return undefined;
  }

  return {
    sha256,
    storageUri,
    sizeBytes,
    ...(encoding === 'utf-8' ? { encoding } : {}),
  };
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
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

function collectDownstreamStepIds(
  steps: ReadonlyArray<WorkflowStep>,
  fromStepId: string
): Set<string> {
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
