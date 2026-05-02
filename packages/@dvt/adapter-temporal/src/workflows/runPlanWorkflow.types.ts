/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.types.ts
 * @ownedConcern Workflow public API contracts and runtime state model
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Define workflow ports and cursor contracts at the DVT boundary before Temporal-specific execution
 * @consequence Workflow helpers share typed state without leaking provider authority into engine contracts
 * @version 1.2.0
 */
import type { MaterializationEvidence, PlanRef } from '@dvt/contracts';

import type { EventType, ExecutionStep, ResolvedRunContext } from '../engine-types.js';

import type { ResolvedExecutionSegment } from './executionSegmentResolver.js';
import type { WorkflowExecutionCursor } from './workflowCursorHelpers.js';

export type WorkflowStep = ExecutionStep;
export type WorkflowPlanRef = PlanRef;
export type WorkflowCtx = ResolvedRunContext;

export type ExecutedStepResult = {
  stepId: string;
  status: 'COMPLETED' | 'FAILED';
  gatewayDecision?: boolean;
  resultEvidence?: MaterializationEvidence;
  failureReason?: string;
  retriable?: boolean;
  error?: string;
};

export type WorkflowActivitiesPort = {
  executeStep(input: {
    step: WorkflowStep;
    ctx: WorkflowCtx;
    gatewayContext?: Record<string, unknown>;
  }): Promise<ExecutedStepResult>;
  emitEvent(input: {
    ctx: WorkflowCtx;
    planRef: WorkflowPlanRef;
    eventType: EventType;
    stepId?: string;
    payload?: Record<string, unknown>;
    logicalAttemptId?: number;
  }): Promise<void>;
  resolveExecutionSegment(input: {
    planRef: WorkflowPlanRef;
    ctx: WorkflowCtx;
    layerIndex: number;
  }): Promise<ResolvedExecutionSegment>;
};

export interface RunPlanWorkflowInput {
  planRef: WorkflowPlanRef;
  ctx: WorkflowCtx;
  maxContinueAsNewPayloadBytes: number;
  continueAsNewAfterLayerCount: number;
  cursor?: WorkflowExecutionCursor;
}

export interface RunPlanWorkflowResult {
  runId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  continuedAsNewCount: number;
}

export interface RuntimeWorkflowState {
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paused: boolean;
  cancelRequested: boolean;
  cancelReason?: string;
  currentStepIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions?: Record<string, boolean>;
}

export interface WorkflowControlInput {
  maxContinueAsNewPayloadBytes: number;
  continueAsNewAfterLayerCount: number;
  nextLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  gatewayDependencyFacts: Record<string, Record<string, unknown>>;
  skippedStepIds: string[];
  processedControlSignalIds: string[];
  latestResultEvidence?: MaterializationEvidence;
}

export interface LayerRuntimeState {
  gatewayDependencyFacts: Record<string, Record<string, unknown>>;
  skippedSteps: Set<string>;
  completedSteps: number;
  processedLayersInCurrentExecution: number;
  latestResultEvidence?: MaterializationEvidence;
}

export type LayerLoopOutcome =
  | { kind: 'all_layers_processed' }
  | { kind: 'terminal'; result: RunPlanWorkflowResult }
  | { kind: 'continue_as_new'; nextInput: RunPlanWorkflowInput };

export interface ExecutePlanLayersArgs {
  input: RunPlanWorkflowInput;
  initialSegment: ResolvedExecutionSegment;
  nextLayerIndex: number;
  continueAsNewAfterLayerCount: number;
  continuedAsNewCount: number;
  ctx: WorkflowCtx;
  planRef: WorkflowPlanRef;
  state: RuntimeWorkflowState;
  runtime: LayerRuntimeState;
  processedControlSignalIds: ReadonlySet<string>;
}

export interface ProcessLayerArgs extends ExecutePlanLayersArgs {
  layerIndex: number;
  segment: ResolvedExecutionSegment;
}

export interface LayerStepExecution {
  stepId: string;
  gatewayDecision?: boolean;
  result: ExecutedStepResult;
}
