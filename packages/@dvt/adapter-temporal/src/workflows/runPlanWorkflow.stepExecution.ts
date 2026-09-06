/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.stepExecution.ts
 * @ownedConcern Per-layer step activity execution orchestration
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0040: Retry Ownership And Attempt Authority
 * @decision Emit step lifecycle events and execute DVT-owned step activities with explicit retry handling
 * @consequence Temporal executes the admitted plan without publishing or projecting artifacts
 * @version 2.0.0
 */
import {
  ActivityFailure,
  ApplicationFailure,
  isCancellation,
  rootCause,
} from '@temporalio/workflow';

import { createStepActivities, eventActivities } from './runPlanWorkflow.activities.js';
import type {
  LayerRuntimeState,
  LayerStepExecution,
  RuntimeWorkflowState,
  WorkflowCtx,
  WorkflowPlanRef,
  WorkflowStep,
} from './runPlanWorkflow.types.js';
import { formatUnknownError } from './workflowErrorHelpers.js';
import { buildGatewayContext } from './workflowGatewayHelpers.js';

export async function emitStepStartedForLayer(
  ctx: WorkflowCtx,
  planRef: WorkflowPlanRef,
  layer: ReadonlyArray<WorkflowStep>
): Promise<void> {
  for (const step of layer) {
    await eventActivities.emitEvent({
      ctx,
      planRef,
      eventType: 'StepStarted',
      stepId: step.stepId,
    });
  }
}

export async function executeLayerSteps(args: {
  layer: ReadonlyArray<WorkflowStep>;
  downstreamStepIdsByGatewayStepId: Record<string, string[]>;
  ctx: WorkflowCtx;
  state: RuntimeWorkflowState;
  runtime: LayerRuntimeState;
}): Promise<LayerStepExecution[]> {
  return Promise.all(args.layer.map((step) => executeLayerStep({ ...args, step })));
}

async function executeLayerStep(args: {
  step: WorkflowStep;
  downstreamStepIdsByGatewayStepId: Record<string, string[]>;
  ctx: WorkflowCtx;
  state: RuntimeWorkflowState;
  runtime: LayerRuntimeState;
}): Promise<LayerStepExecution> {
  try {
    const gatewayContext = resolveGatewayContextForStep(
      args.step,
      args.runtime.gatewayDependencyFacts
    );

    const result = await createStepActivities(
      args.step,
      args.runtime.stepActivityRouting
    ).executeStep({
      step: args.step,
      ctx: args.ctx,
      ...(gatewayContext === undefined ? {} : { gatewayContext }),
    });

    const gatewayDecision = resolveGatewayDecision(args.step, result.gatewayDecision);

    applyGatewayDecisionEffects({
      gatewayDecision,
      stepId: args.step.stepId,
      downstreamStepIdsByGatewayStepId: args.downstreamStepIdsByGatewayStepId,
      state: args.state,
      skippedSteps: args.runtime.skippedSteps,
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
  gatewayDependencyFacts: Record<string, Record<string, unknown>>
): Record<string, unknown> | undefined {
  if (step.type !== 'gateway') {
    return undefined;
  }

  return buildGatewayContext(step, gatewayDependencyFacts);
}

function resolveGatewayDecision(
  step: WorkflowStep,
  gatewayDecision: boolean | undefined
): boolean | undefined {
  if (step.type !== 'gateway') {
    return undefined;
  }

  return typeof gatewayDecision === 'boolean' ? gatewayDecision : undefined;
}

function applyGatewayDecisionEffects(args: {
  gatewayDecision: boolean | undefined;
  stepId: string;
  downstreamStepIdsByGatewayStepId: Record<string, string[]>;
  state: RuntimeWorkflowState;
  skippedSteps: Set<string>;
}): void {
  if (typeof args.gatewayDecision !== 'boolean') {
    return;
  }

  args.state.gatewayDecisions ??= {};
  args.state.gatewayDecisions[args.stepId] = args.gatewayDecision;

  if (args.gatewayDecision) {
    return;
  }

  for (const downstreamStepId of args.downstreamStepIdsByGatewayStepId[args.stepId] ?? []) {
    args.skippedSteps.add(downstreamStepId);
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
  if (hasApplicationFailureType(applicationFailure)) {
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

  if (!hasCause(error)) {
    return undefined;
  }

  return findApplicationFailure((error as { cause?: unknown }).cause);
}

function hasApplicationFailureType(
  error: ApplicationFailure | undefined
): error is ApplicationFailure & { type: string } {
  return typeof error?.type === 'string' && error.type.length > 0;
}

function hasCause(error: unknown): error is { cause?: unknown } {
  return typeof error === 'object' && error !== null && 'cause' in error;
}
