/**
 * DVT Engine - Workflow Mapper
 * Maps between IWorkflowEngine types and Temporal SDK types
 * Phase 1: Basic type conversions
 */

import {
  WorkflowExecutionDescription,
  WorkflowExecutionStatusName,
} from '@temporalio/client';

import {
  EngineRunRef,
  RunStatus,
  RunStatusSnapshot,
  ExecutionPlan,
  RunContext,
  PlanRef,
} from '../../types/contracts';

/**
 * Map Temporal workflow status to DVT RunStatus.
 */
export function mapTemporalStatusToRunStatus(
  status: WorkflowExecutionStatusName,
): RunStatus {
  switch (status) {
    case 'RUNNING':
      return 'RUNNING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
      return 'FAILED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'TERMINATED':
      return 'CANCELLED';
    case 'CONTINUED_AS_NEW':
      return 'RUNNING'; // Still running in a new execution
    case 'TIMED_OUT':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

/**
 * Map Temporal WorkflowExecutionDescription to RunStatusSnapshot.
 * Phase 1: Basic mapping without full step details.
 */
export function mapTemporalDescriptionToSnapshot(
  description: WorkflowExecutionDescription,
  runId: string,
): RunStatusSnapshot {
  const status = mapTemporalStatusToRunStatus(
    description.status.name as WorkflowExecutionStatusName,
  );

  return {
    runId,
    status,
    lastEventSeq: 0, // Phase 1: Set from StateStore, not from Temporal
    steps: [], // Phase 1: Steps populated from StateStore
    artifacts: [],
    startedAt: description.startTime?.toISOString(),
    completedAt: description.closeTime?.toISOString(),
    totalDurationMs: description.closeTime
      ? description.closeTime.getTime() - description.startTime.getTime()
      : undefined,
  };
}

/**
 * Create EngineRunRef from Temporal workflow details.
 */
export function createTemporalEngineRunRef(
  namespace: string,
  workflowId: string,
  runId: string,
  taskQueue?: string,
): EngineRunRef {
  return {
    provider: 'temporal',
    namespace,
    workflowId,
    runId,
    taskQueue,
  };
}

/**
 * Extract workflow ID and run ID from EngineRunRef.
 * Validates that the ref is for Temporal.
 */
export function extractTemporalIds(engineRunRef: EngineRunRef): {
  workflowId: string;
  runId?: string;
  namespace: string;
  taskQueue?: string;
} {
  if (engineRunRef.provider !== 'temporal') {
    throw new Error(
      `Expected Temporal EngineRunRef, got ${engineRunRef.provider}`,
    );
  }

  return {
    workflowId: engineRunRef.workflowId,
    runId: engineRunRef.runId,
    namespace: engineRunRef.namespace,
    taskQueue: engineRunRef.taskQueue,
  };
}

/**
 * Create PlanRef from ExecutionPlan.
 * Phase 1: Simplified - assumes plan is stored and accessible.
 * Phase 2+: Actual S3/GCS storage integration.
 */
export function createPlanRef(
  plan: ExecutionPlan,
  uri: string,
  sha256: string,
): PlanRef {
  return {
    uri,
    sha256,
    schemaVersion: plan.schemaVersion,
    planId: plan.planId,
    planVersion: plan.planVersion,
  };
}

/**
 * Create workflow ID from RunContext.
 * Format: {projectId}-{environmentId}-{runId}
 */
export function createWorkflowId(context: RunContext): string {
  return `${context.projectId}-${context.environmentId}-${context.runId}`;
}

/**
 * Determine task queue from RunContext and ExecutionPlan.
 * Phase 1: Uses default task queue from config.
 * Phase 2+: Implements routing logic based on step classes.
 */
export function determineTaskQueue(
  context: RunContext,
  defaultTaskQueue?: string,
): string {
  // Phase 1: Simple default task queue
  if (defaultTaskQueue) {
    return defaultTaskQueue;
  }

  // Fallback: environment-based task queue
  return `tq-control-${context.environmentId}`;
}
