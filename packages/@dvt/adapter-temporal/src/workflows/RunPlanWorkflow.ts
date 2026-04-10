/**
 * @file packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 5 — Workflow remains deterministic and delegates side effects to activities
 * @decision Section 3 — Lifecycle signaling/query handling follows canonical run state transitions
 * @consequence Temporal workflow execution is replay-safe and aligned with engine lifecycle contracts
 * @version 1.2.0
 * @date 2026-03-07
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
import { collectDownstreamStepIds, planExecutionLayers } from '@dvt/plan-interpreter';
import {
  ActivityCancellationType,
  ActivityFailure,
  ApplicationFailure,
  CancellationScope,
  continueAsNew,
  condition,
  defineQuery,
  defineSignal,
  isCancellation,
  proxyLocalActivities,
  proxyActivities,
  rootCause,
  setHandler,
} from '@temporalio/workflow';

import type {
  EventType,
  ExecutionPlan,
  ExecutionStep,
  ResolvedRunContext,
} from '../engine-types.js';

import {
  buildCompletedStepFact,
  buildContinueAsNewInput,
  buildGatewayContext,
  buildStepStartedPayload,
  formatUnknownError,
  normalizeDependsOn,
  parseOptionalNonNegativeInt,
  parseOptionalStringArray,
  resolveMaterializationEvidence,
  resolveTransformationExecutor,
  shouldTriggerContinueAsNew,
  validateGatewayDependencies,
} from './workflowHelpers.js';

type WorkflowStep = ExecutionStep;

type ExecutedStepResult = {
  stepId: string;
  status: 'COMPLETED' | 'FAILED';
  gatewayDecision?: boolean;
  resultEvidence?: {
    executor: 'postgres' | 'dbt';
    environmentId: string;
    sinkTable: string;
    rowsWritten: number;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  failureReason?: string;
  retriable?: boolean;
  error?: string;
};

// ---------------------------------------------------------------------------
// Activities port — workflow declares only what it needs (ISP)
// ---------------------------------------------------------------------------

type WorkflowActivitiesPort = {
  executeStep(input: {
    step: WorkflowStep;
    ctx: RunPlanWorkflowInput['ctx'];
    gatewayContext?: Record<string, unknown>;
  }): Promise<ExecutedStepResult>;
  emitEvent(input: {
    ctx: RunPlanWorkflowInput['ctx'];
    planRef: RunPlanWorkflowInput['planRef'];
    eventType: EventType;
    stepId?: string;
    payload?: Record<string, unknown>;
    logicalAttemptId?: number;
  }): Promise<void>;
};

// ---------------------------------------------------------------------------
// Workflow input / output
// ---------------------------------------------------------------------------

export interface RunPlanWorkflowInput {
  plan: ExecutionPlan;
  planRef: {
    uri: string;
    sha256: string;
    schemaVersion: string;
    planId: string;
    planVersion: string;
    sizeBytes?: number;
    expiresAt?: string;
  };
  ctx: ResolvedRunContext;
  /** Number of layers to process before continue-as-new (`0` disables rollover). */
  continueAsNewAfterLayerCount?: number;
  /** Internal resume cursor used across continue-as-new executions. */
  resumeFromLayerIndex?: number;
  /** Internal cumulative counter used for observability and test assertions. */
  continuedAsNewCount?: number;
  /** Internal gateway decision map carried across continue-as-new rollovers. */
  gatewayDecisions?: Record<string, boolean>;
  /** Internal completed step fact map carried across continue-as-new rollovers. */
  completedStepResults?: Record<string, Record<string, unknown>>;
  /** Internal skipped-step set carried across continue-as-new rollovers. */
  skippedStepIds?: string[];
  /** Internal processed control-signal ids carried across continue-as-new rollovers. */
  processedControlSignalIds?: string[];
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
  /** Dedicated pause flag: used by condition() predicate to avoid TypeScript CFA cast. */
  paused: boolean;
  /** Dedicated cancel-request flag: used by condition() predicates at safe points. */
  cancelRequested: boolean;
  cancelReason?: string;
  currentStepIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions?: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Signals & queries
// ---------------------------------------------------------------------------

export const pauseSignal = defineSignal<[string]>('pause');
export const resumeSignal = defineSignal<[string]>('resume');
export const cancelSignal = defineSignal<[string | undefined]>('cancel');
export const statusQuery = defineQuery<WorkflowState>('status');

// ---------------------------------------------------------------------------
// Activity proxy (all side-effects delegated to activities)
// ---------------------------------------------------------------------------

const stepActivities = proxyActivities<Pick<WorkflowActivitiesPort, 'executeStep'>>({
  startToCloseTimeout: '30m',
  cancellationType: ActivityCancellationType.TRY_CANCEL,
  retry: {
    initialInterval: '1s',
    maximumInterval: '60s',
    backoffCoefficient: 2,
    // Technical retries only. These must not create new logical attempts.
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['PermanentStepError'],
  },
});

const eventActivities = proxyActivities<Pick<WorkflowActivitiesPort, 'emitEvent'>>({
  startToCloseTimeout: '30m',
  retry: {
    initialInterval: '1s',
    maximumInterval: '60s',
    backoffCoefficient: 2,
    // Technical retries only. These must not create new logical attempts.
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['PermanentStepError'],
  },
});

const terminalEventActivities = proxyLocalActivities<Pick<WorkflowActivitiesPort, 'emitEvent'>>({
  startToCloseTimeout: '1m',
  cancellationType: ActivityCancellationType.WAIT_CANCELLATION_COMPLETED,
  retry: {
    initialInterval: '1s',
    maximumInterval: '5s',
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
  const ctrl = parseWorkflowControlInput(input);

  const state = createInitialWorkflowState(ctrl.continuedAsNewCount, input.gatewayDecisions);
  const processedControlSignalIds = new Set(ctrl.processedControlSignalIds);
  registerSignalHandlers(state, processedControlSignalIds);

  const completedStepResults = cloneStepResults(input.completedStepResults);
  const skippedSteps = new Set<string>(ctrl.skippedStepIds);
  const runtimeExecutor = resolveTransformationExecutor(input.plan);

  try {
    await bootstrapFirstExecutionIfNeeded(ctrl.resumeFromLayerIndex, ctx, planRef, runtimeExecutor);

    const plan = input.plan;
    validateGatewayDependencies(plan.steps);
    const executionLayers = planExecutionLayers<WorkflowStep>(plan.steps);
    if (ctrl.resumeFromLayerIndex > executionLayers.length) {
      throw new TypeError('INVALID_WORKFLOW_STATE: resumeFromLayerIndex_out_of_range');
    }

    const runtime: LayerRuntimeState = {
      completedStepResults,
      skippedSteps,
      completedSteps: countStepsBeforeLayer(executionLayers, ctrl.resumeFromLayerIndex),
      processedLayersInCurrentExecution: 0,
    };
    state.currentStepIndex = runtime.completedSteps;

    const layerOutcome = await executePlanLayers({
      input,
      planSteps: plan.steps,
      executionLayers,
      resumeFromLayerIndex: ctrl.resumeFromLayerIndex,
      continueAsNewAfterLayerCount: ctrl.continueAsNewAfterLayerCount,
      continuedAsNewCount: ctrl.continuedAsNewCount,
      runtimeExecutor,
      ctx,
      planRef,
      state,
      runtime,
      processedControlSignalIds,
    });

    return resolveLayerLoopOutcome({
      layerOutcome,
      ctx,
      planRef,
      state,
      continuedAsNewCount: ctrl.continuedAsNewCount,
      runtimeExecutor,
      completedStepResults,
    });
  } catch (err) {
    const cancelled = await finalizeNativeCancellationIfNeeded({
      error: err,
      state,
      ctx,
      planRef,
      continuedAsNewCount: ctrl.continuedAsNewCount,
    });
    if (cancelled) {
      return cancelled;
    }
    await markWorkflowFailedIfNeeded(state, ctx, planRef, runtimeExecutor);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

interface WorkflowControlInput {
  continueAsNewAfterLayerCount: number;
  resumeFromLayerIndex: number;
  continuedAsNewCount: number;
  skippedStepIds: string[];
  processedControlSignalIds: string[];
}

function parseWorkflowControlInput(input: RunPlanWorkflowInput): WorkflowControlInput {
  return {
    continueAsNewAfterLayerCount: parseOptionalNonNegativeInt(
      input.continueAsNewAfterLayerCount,
      'continueAsNewAfterLayerCount'
    ),
    resumeFromLayerIndex: parseOptionalNonNegativeInt(
      input.resumeFromLayerIndex,
      'resumeFromLayerIndex'
    ),
    continuedAsNewCount: parseOptionalNonNegativeInt(
      input.continuedAsNewCount,
      'continuedAsNewCount'
    ),
    skippedStepIds: parseOptionalStringArray(input.skippedStepIds, 'skippedStepIds'),
    processedControlSignalIds: parseOptionalStringArray(
      input.processedControlSignalIds,
      'processedControlSignalIds'
    ),
  };
}

// ---------------------------------------------------------------------------
// Outcome resolution
// ---------------------------------------------------------------------------

async function resolveLayerLoopOutcome(args: {
  layerOutcome: LayerLoopOutcome;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  state: WorkflowState;
  continuedAsNewCount: number;
  runtimeExecutor?: 'postgres' | 'dbt';
  completedStepResults: Record<string, Record<string, unknown>>;
}): Promise<RunPlanWorkflowResult> {
  if (args.layerOutcome.kind === 'terminal') {
    return args.layerOutcome.result;
  }
  const cancelled = await finalizeCancellationIfRequested({
    state: args.state,
    ctx: args.ctx,
    planRef: args.planRef,
    continuedAsNewCount: args.continuedAsNewCount,
  });
  if (cancelled) {
    return cancelled;
  }
  if (args.layerOutcome.kind === 'continue_as_new') {
    return continueAsNew<typeof runPlanWorkflow>(args.layerOutcome.nextInput);
  }

  const resultEvidence = resolveLatestResultEvidence(args.completedStepResults);
  const runCompletedPayload =
    args.runtimeExecutor === undefined && resultEvidence === undefined
      ? undefined
      : {
          ...(args.runtimeExecutor === undefined ? {} : { executor: args.runtimeExecutor }),
          ...(resultEvidence === undefined ? {} : { resultEvidence }),
        };
  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'RunCompleted',
    ...(runCompletedPayload === undefined ? {} : { payload: runCompletedPayload }),
  });
  args.state.status = 'COMPLETED';
  return {
    runId: args.ctx.runId,
    status: 'COMPLETED',
    continuedAsNewCount: args.continuedAsNewCount,
  };
}

async function markWorkflowFailedIfNeeded(
  state: WorkflowState,
  ctx: RunPlanWorkflowInput['ctx'],
  planRef: RunPlanWorkflowInput['planRef'],
  runtimeExecutor?: 'postgres' | 'dbt'
): Promise<void> {
  if (state.status === 'CANCELLED' || state.status === 'FAILED') return;
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
    // best-effort; do not mask the original error
  }
  state.status = 'FAILED';
}

// ---------------------------------------------------------------------------
// State initialisation & signal handlers
// ---------------------------------------------------------------------------

function createInitialWorkflowState(
  continuedAsNewCount: number,
  gatewayDecisions: Record<string, boolean> | undefined
): WorkflowState {
  return {
    status: 'RUNNING',
    paused: false,
    cancelRequested: false,
    currentStepIndex: 0,
    continuedAsNewCount,
    gatewayDecisions: gatewayDecisions ? { ...gatewayDecisions } : undefined,
  };
}

function registerSignalHandlers(
  state: WorkflowState,
  processedControlSignalIds: Set<string>
): void {
  setHandler(pauseSignal, (signalId: string) => {
    if (isDuplicateControlSignal(signalId, processedControlSignalIds)) return;
    if (state.status !== 'RUNNING') return;
    state.paused = true;
    state.status = 'PAUSED';
  });

  setHandler(resumeSignal, (signalId: string) => {
    if (isDuplicateControlSignal(signalId, processedControlSignalIds)) return;
    if (!state.paused) return;
    state.paused = false;
    state.status = 'RUNNING';
  });

  setHandler(cancelSignal, (reason: string | undefined) => {
    if (state.status === 'COMPLETED' || state.status === 'FAILED' || state.status === 'CANCELLED') {
      return;
    }
    state.cancelRequested = true;
    if (reason !== undefined) {
      state.cancelReason = reason;
    }
  });

  setHandler(statusQuery, () => state);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function bootstrapFirstExecutionIfNeeded(
  resumeFromLayerIndex: number,
  ctx: RunPlanWorkflowInput['ctx'],
  planRef: RunPlanWorkflowInput['planRef'],
  runtimeExecutor?: 'postgres' | 'dbt'
): Promise<void> {
  if (resumeFromLayerIndex !== 0) return;
  // run_metadata + RunQueued are committed by WorkflowEngine before adapter.startRun(),
  // so the event store is guaranteed to exist by the time this activity executes.
  await eventActivities.emitEvent({
    ctx,
    planRef,
    eventType: 'RunStarted',
    ...(runtimeExecutor === undefined ? {} : { payload: { executor: runtimeExecutor } }),
  });
}

// ---------------------------------------------------------------------------
// Layer execution loop
// ---------------------------------------------------------------------------

interface LayerRuntimeState {
  completedStepResults: Record<string, Record<string, unknown>>;
  skippedSteps: Set<string>;
  completedSteps: number;
  processedLayersInCurrentExecution: number;
}

type LayerLoopOutcome =
  | { kind: 'all_layers_processed' }
  | { kind: 'terminal'; result: RunPlanWorkflowResult }
  | { kind: 'continue_as_new'; nextInput: RunPlanWorkflowInput };

interface ExecutePlanLayersArgs {
  input: RunPlanWorkflowInput;
  planSteps: ReadonlyArray<WorkflowStep>;
  executionLayers: ReadonlyArray<ReadonlyArray<WorkflowStep>>;
  resumeFromLayerIndex: number;
  continueAsNewAfterLayerCount: number;
  continuedAsNewCount: number;
  runtimeExecutor?: 'postgres' | 'dbt';
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  state: WorkflowState;
  runtime: LayerRuntimeState;
  processedControlSignalIds: ReadonlySet<string>;
}

interface ProcessLayerArgs extends ExecutePlanLayersArgs {
  layerIndex: number;
}

async function executePlanLayers(args: ExecutePlanLayersArgs): Promise<LayerLoopOutcome> {
  for (
    let layerIndex = args.resumeFromLayerIndex;
    layerIndex < args.executionLayers.length;
    layerIndex += 1
  ) {
    const layerOutcome = await processLayer({ ...args, layerIndex });
    if (layerOutcome) return layerOutcome;
  }
  return { kind: 'all_layers_processed' };
}

async function processLayer(args: ProcessLayerArgs): Promise<LayerLoopOutcome | null> {
  const layer = args.executionLayers[args.layerIndex];
  if (layer === undefined) return null;

  const executableLayer = selectExecutableLayer(layer, args.runtime.skippedSteps);

  await emitSkippedStepsInLayer({
    layer,
    executableLayer,
    skippedSteps: args.runtime.skippedSteps,
    ctx: args.ctx,
    planRef: args.planRef,
  });

  args.state.currentStepIndex = args.runtime.completedSteps;

  const terminalBeforeLayer = await handlePreLayerLifecycle({
    state: args.state,
    ctx: args.ctx,
    planRef: args.planRef,
    continuedAsNewCount: args.continuedAsNewCount,
  });
  if (terminalBeforeLayer) return { kind: 'terminal', result: terminalBeforeLayer };

  if (executableLayer.length === 0) {
    args.runtime.processedLayersInCurrentExecution += 1;
    return null;
  }

  await emitStepStartedForLayer(args.ctx, args.planRef, executableLayer);

  const layerResults = await executeLayerSteps({
    layer: executableLayer,
    planSteps: args.planSteps,
    ctx: args.ctx,
    state: args.state,
    runtime: args.runtime,
  });

  const terminalFromResults = await applyLayerResults({
    layerResults,
    ctx: args.ctx,
    planRef: args.planRef,
    state: args.state,
    runtime: args.runtime,
    continuedAsNewCount: args.continuedAsNewCount,
    runtimeExecutor: args.runtimeExecutor,
  });
  if (terminalFromResults) return { kind: 'terminal', result: terminalFromResults };

  const terminalAfterLayer = await finalizeCancellationIfRequested({
    state: args.state,
    ctx: args.ctx,
    planRef: args.planRef,
    continuedAsNewCount: args.continuedAsNewCount,
  });
  if (terminalAfterLayer) return { kind: 'terminal', result: terminalAfterLayer };

  args.runtime.processedLayersInCurrentExecution += 1;
  return maybeBuildContinueAsNewOutcome({
    input: args.input,
    continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
    continuedAsNewCount: args.continuedAsNewCount,
    executionLayers: args.executionLayers,
    layerIndex: args.layerIndex,
    processedLayersInCurrentExecution: args.runtime.processedLayersInCurrentExecution,
    gatewayDecisions: args.state.gatewayDecisions ?? {},
    completedStepResults: args.runtime.completedStepResults,
    skippedStepIds: args.runtime.skippedSteps,
    processedControlSignalIds: args.processedControlSignalIds,
  });
}

function maybeBuildContinueAsNewOutcome(args: {
  input: RunPlanWorkflowInput;
  continueAsNewAfterLayerCount: number;
  continuedAsNewCount: number;
  executionLayers: ReadonlyArray<ReadonlyArray<WorkflowStep>>;
  layerIndex: number;
  processedLayersInCurrentExecution: number;
  gatewayDecisions: Record<string, boolean>;
  completedStepResults: Record<string, Record<string, unknown>>;
  skippedStepIds: ReadonlySet<string>;
  processedControlSignalIds: ReadonlySet<string>;
}): LayerLoopOutcome | null {
  const nextLayerIndex = args.layerIndex + 1;
  if (
    !shouldTriggerContinueAsNew({
      continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
      processedLayersInCurrentExecution: args.processedLayersInCurrentExecution,
      nextLayerIndex,
      totalLayerCount: args.executionLayers.length,
    })
  ) {
    return null;
  }

  return {
    kind: 'continue_as_new',
    nextInput: buildContinueAsNewInput({
      input: args.input,
      continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
      nextLayerIndex,
      continuedAsNewCount: args.continuedAsNewCount,
      gatewayDecisions: args.gatewayDecisions,
      completedStepResults: args.completedStepResults,
      skippedStepIds: args.skippedStepIds,
      processedControlSignalIds: args.processedControlSignalIds,
    }),
  };
}

// ---------------------------------------------------------------------------
// Layer helpers
// ---------------------------------------------------------------------------

function selectExecutableLayer(
  layer: ReadonlyArray<WorkflowStep>,
  skippedSteps: ReadonlySet<string>
): WorkflowStep[] {
  return layer.filter((step) => {
    if (skippedSteps.has(step.stepId)) return false;
    const deps = normalizeDependsOn(step.dependsOn);
    return !deps.some((dep) => skippedSteps.has(dep));
  });
}

async function emitSkippedStepsInLayer(args: {
  layer: ReadonlyArray<WorkflowStep>;
  executableLayer: ReadonlyArray<WorkflowStep>;
  skippedSteps: Set<string>;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
}): Promise<void> {
  const executableIds = new Set(args.executableLayer.map((step) => step.stepId));
  for (const step of args.layer) {
    if (executableIds.has(step.stepId)) continue;
    args.skippedSteps.add(step.stepId);
    await eventActivities.emitEvent({
      ctx: args.ctx,
      planRef: args.planRef,
      eventType: 'StepSkipped',
      stepId: step.stepId,
    });
  }
}

async function handlePreLayerLifecycle(args: {
  state: WorkflowState;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  continuedAsNewCount: number;
}): Promise<RunPlanWorkflowResult | null> {
  const cancelled = await finalizeCancellationIfRequested(args);
  if (cancelled) return cancelled;

  if (!args.state.paused) return null;

  await eventActivities.emitEvent({ ctx: args.ctx, planRef: args.planRef, eventType: 'RunPaused' });
  await condition(() => !args.state.paused || args.state.cancelRequested);

  const cancelledWhilePaused = await finalizeCancellationIfRequested(args);
  if (cancelledWhilePaused) return cancelledWhilePaused;

  await eventActivities.emitEvent({
    ctx: args.ctx,
    planRef: args.planRef,
    eventType: 'RunResumed',
  });
  return null;
}

async function finalizeCancellationIfRequested(args: {
  state: WorkflowState;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  continuedAsNewCount: number;
}): Promise<RunPlanWorkflowResult | null> {
  if (!args.state.cancelRequested) {
    return null;
  }

  return emitTerminalCancellation(args, { includeRequestEvent: true });
}

async function finalizeNativeCancellationIfNeeded(args: {
  error: unknown;
  state: WorkflowState;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  continuedAsNewCount: number;
}): Promise<RunPlanWorkflowResult | null> {
  if (!isCancellation(args.error)) {
    return null;
  }

  return CancellationScope.nonCancellable(async () =>
    emitTerminalCancellation(args, { includeRequestEvent: !args.state.cancelRequested })
  );
}

async function emitTerminalCancellation(
  args: {
    state: WorkflowState;
    ctx: RunPlanWorkflowInput['ctx'];
    planRef: RunPlanWorkflowInput['planRef'];
    continuedAsNewCount: number;
  },
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

async function emitStepStartedForLayer(
  ctx: RunPlanWorkflowInput['ctx'],
  planRef: RunPlanWorkflowInput['planRef'],
  layer: ReadonlyArray<WorkflowStep>
): Promise<void> {
  for (const step of layer) {
    const stepStartedPayload = buildStepStartedPayload(step);
    await eventActivities.emitEvent({
      ctx,
      planRef,
      eventType: 'StepStarted',
      stepId: step.stepId,
      ...(stepStartedPayload ? { payload: stepStartedPayload } : {}),
    });
  }
}

// ---------------------------------------------------------------------------
// Step execution
// ---------------------------------------------------------------------------

interface LayerStepExecution {
  stepId: string;
  gatewayDecision?: boolean;
  result: ExecutedStepResult;
}

async function executeLayerSteps(args: {
  layer: ReadonlyArray<WorkflowStep>;
  planSteps: ReadonlyArray<WorkflowStep>;
  ctx: RunPlanWorkflowInput['ctx'];
  state: WorkflowState;
  runtime: LayerRuntimeState;
}): Promise<LayerStepExecution[]> {
  return Promise.all(args.layer.map((step) => executeLayerStep({ ...args, step })));
}

async function executeLayerStep(args: {
  step: WorkflowStep;
  planSteps: ReadonlyArray<WorkflowStep>;
  ctx: RunPlanWorkflowInput['ctx'];
  state: WorkflowState;
  runtime: LayerRuntimeState;
}): Promise<LayerStepExecution> {
  try {
    const gatewayContext = resolveGatewayContextForStep(
      args.step,
      args.runtime.completedStepResults
    );

    const result = await stepActivities.executeStep({
      step: args.step,
      ctx: args.ctx,
      ...(gatewayContext ? { gatewayContext } : {}),
    });

    const gatewayDecision = resolveGatewayDecision(args.step, result);
    applyGatewayDecisionEffects({
      gatewayDecision,
      stepId: args.step.stepId,
      planSteps: args.planSteps,
      state: args.state,
      runtime: args.runtime,
    });

    return { stepId: args.step.stepId, gatewayDecision, result };
  } catch (error) {
    if (isCancellation(error)) {
      throw error;
    }
    return buildFailedLayerStepExecution(args.step.stepId, error);
  }
}

function resolveGatewayContextForStep(
  step: WorkflowStep,
  completedStepResults: Record<string, Record<string, unknown>>
): Record<string, unknown> | undefined {
  if (step.type !== 'gateway') return undefined;
  return buildGatewayContext(step, completedStepResults);
}

function resolveGatewayDecision(
  step: WorkflowStep,
  result: ExecutedStepResult
): boolean | undefined {
  return step.type === 'gateway' && typeof result.gatewayDecision === 'boolean'
    ? result.gatewayDecision
    : undefined;
}

function applyGatewayDecisionEffects(args: {
  gatewayDecision: boolean | undefined;
  stepId: string;
  planSteps: ReadonlyArray<WorkflowStep>;
  state: WorkflowState;
  runtime: LayerRuntimeState;
}): void {
  if (typeof args.gatewayDecision !== 'boolean') return;

  args.state.gatewayDecisions ??= {};
  args.state.gatewayDecisions[args.stepId] = args.gatewayDecision;

  if (args.gatewayDecision) return;

  const downstream = collectDownstreamStepIds(args.planSteps, args.stepId);
  for (const downstreamStepId of downstream) {
    args.runtime.skippedSteps.add(downstreamStepId);
  }
}

function buildFailedLayerStepExecution(stepId: string, error: unknown): LayerStepExecution {
  const message = resolveFailureMessage(error);
  return {
    stepId,
    result: {
      stepId,
      status: 'FAILED',
      failureReason: extractFailureReason(error, message),
      retriable: isRetriableStepError(error),
      error: message,
    },
  };
}

function isRetriableStepError(error: unknown): boolean {
  const applicationFailure = findApplicationFailure(error);
  if (applicationFailure) {
    return applicationFailure.nonRetryable !== true;
  }

  if (error instanceof ActivityFailure) {
    return error.retryState !== 'NON_RETRYABLE_FAILURE';
  }

  return true;
}

function extractFailureReason(error: unknown, message: string): string | undefined {
  const applicationFailure = findApplicationFailure(error);
  if (
    applicationFailure &&
    typeof applicationFailure.type === 'string' &&
    applicationFailure.type.length > 0
  ) {
    return applicationFailure.type;
  }

  const [prefix] = message.split(':', 1);
  return typeof prefix === 'string' && prefix.trim().length > 0 ? prefix.trim() : undefined;
}

function resolveFailureMessage(error: unknown): string {
  const message =
    rootCause(error) ?? (error instanceof Error ? error.message : formatUnknownError(error));
  return typeof message === 'string' && message.length > 0 ? message : 'Unknown workflow failure';
}

function findApplicationFailure(error: unknown): ApplicationFailure | undefined {
  if (error instanceof ApplicationFailure) {
    return error;
  }

  const cause = resolveCause(error);
  return cause === undefined ? undefined : findApplicationFailure(cause);
}

function resolveCause(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  if ('cause' in error) {
    return (error as { cause?: unknown }).cause;
  }

  return undefined;
}

function resolveLatestResultEvidence(
  completedStepResults: Record<string, Record<string, unknown>>
): ExecutedStepResult['resultEvidence'] {
  const results = Object.values(completedStepResults);
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const resultEvidence = resolveMaterializationEvidence(results[index]?.['resultEvidence']);
    if (resultEvidence !== undefined) {
      return resultEvidence;
    }
  }

  return undefined;
}

async function applyLayerResults(args: {
  layerResults: ReadonlyArray<LayerStepExecution>;
  ctx: RunPlanWorkflowInput['ctx'];
  planRef: RunPlanWorkflowInput['planRef'];
  state: WorkflowState;
  runtime: LayerRuntimeState;
  continuedAsNewCount: number;
  runtimeExecutor?: 'postgres' | 'dbt';
}): Promise<RunPlanWorkflowResult | null> {
  for (const { stepId, result, gatewayDecision } of args.layerResults) {
    if (result.status === 'COMPLETED') {
      const completedPayload =
        typeof gatewayDecision === 'boolean' || result.resultEvidence !== undefined
          ? {
              ...(typeof gatewayDecision === 'boolean' ? { gatewayDecision } : {}),
              ...(result.resultEvidence === undefined
                ? {}
                : { resultEvidence: result.resultEvidence }),
            }
          : undefined;
      await eventActivities.emitEvent({
        ctx: args.ctx,
        planRef: args.planRef,
        eventType: 'StepCompleted',
        stepId,
        ...(completedPayload ? { payload: completedPayload } : {}),
      });

      args.runtime.completedStepResults[stepId] = buildCompletedStepFact(
        stepId,
        gatewayDecision,
        result.resultEvidence
      );
      args.runtime.completedSteps += 1;
      args.state.currentStepIndex = args.runtime.completedSteps;
      continue;
    }

    const stepFailedPayload =
      result.failureReason !== undefined || result.error !== undefined
        ? {
            ...(result.failureReason === undefined ? {} : { reason: result.failureReason }),
            ...(result.error === undefined ? {} : { message: result.error }),
          }
        : undefined;
    await eventActivities.emitEvent({
      ctx: args.ctx,
      planRef: args.planRef,
      eventType: 'StepFailed',
      stepId,
      ...(stepFailedPayload === undefined ? {} : { payload: stepFailedPayload }),
    });
    await eventActivities.emitEvent({
      ctx: args.ctx,
      planRef: args.planRef,
      eventType: 'RunFailed',
      payload: {
        reason: 'STEP_FAILURE',
        ...(args.runtimeExecutor === undefined ? {} : { executor: args.runtimeExecutor }),
        ...(result.error === undefined ? {} : { message: result.error }),
      },
    });
    args.state.status = 'FAILED';
    return {
      runId: args.ctx.runId,
      status: 'FAILED',
      continuedAsNewCount: args.continuedAsNewCount,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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

function cloneStepResults(
  value: Record<string, Record<string, unknown>> | undefined
): Record<string, Record<string, unknown>> {
  if (!value) return {};
  const cloned: Record<string, Record<string, unknown>> = {};
  for (const [stepId, result] of Object.entries(value)) {
    cloned[stepId] = { ...result };
  }
  return cloned;
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
