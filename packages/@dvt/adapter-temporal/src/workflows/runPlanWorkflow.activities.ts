/**
 * @file packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.activities.ts
 * @ownedConcern Temporal activity proxy binding for workflow ports
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0040: Retry Ownership And Attempt Authority
 * @decision Keep workflow side effects behind Temporal activities while DVT-owned retry policy drives step execution attempts
 * @consequence Workflow replay stays deterministic and retry behavior remains explicit at the DVT activity boundary
 * @version 1.2.0
 */
import {
  ActivityCancellationType,
  proxyActivities,
  proxyLocalActivities,
} from '@temporalio/workflow';

import type { WorkflowActivitiesPort, WorkflowStep } from './runPlanWorkflow.types.js';
import type { WorkflowStepActivityRouting } from './runPlanWorkflow.types.js';
import { resolveStepActivityRetryPolicy } from './workflowArtifactHelpers.js';

export function createStepActivities(
  step: WorkflowStep,
  stepActivityRouting?: WorkflowStepActivityRouting
): Pick<WorkflowActivitiesPort, 'executeStep'> {
  return proxyActivities<Pick<WorkflowActivitiesPort, 'executeStep'>>({
    startToCloseTimeout: '30m',
    cancellationType: ActivityCancellationType.TRY_CANCEL,
    retry: resolveStepActivityRetryPolicy(step),
    ...resolveStepActivityTaskQueue(step, stepActivityRouting),
  });
}

function resolveStepActivityTaskQueue(
  step: WorkflowStep,
  stepActivityRouting: WorkflowStepActivityRouting | undefined
): { taskQueue?: string } {
  const stepKind = step.kind;
  if (typeof stepKind !== 'string' || stepKind.length === 0) {
    return {};
  }

  const route = stepActivityRouting?.routesByStepKind[stepKind];
  return route === undefined ? {} : { taskQueue: route.taskQueue };
}

export const eventActivities = proxyActivities<Pick<WorkflowActivitiesPort, 'emitEvent'>>({
  startToCloseTimeout: '30m',
  retry: {
    initialInterval: '1s',
    maximumInterval: '60s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['PermanentStepError'],
  },
});

export const segmentActivities = proxyActivities<
  Pick<WorkflowActivitiesPort, 'resolveExecutionSegment'>
>({
  startToCloseTimeout: '5m',
  retry: {
    initialInterval: '1s',
    maximumInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ['PermanentStepError'],
  },
});

export const terminalEventActivities = proxyLocalActivities<
  Pick<WorkflowActivitiesPort, 'emitEvent'>
>({
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
