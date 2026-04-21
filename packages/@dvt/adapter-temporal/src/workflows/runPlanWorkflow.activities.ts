import {
  ActivityCancellationType,
  proxyActivities,
  proxyLocalActivities,
} from '@temporalio/workflow';

import type { WorkflowActivitiesPort, WorkflowStep } from './runPlanWorkflow.types.js';
import { resolveStepActivityRetryPolicy } from './workflowHelpers.js';

export function createStepActivities(
  step: WorkflowStep
): Pick<WorkflowActivitiesPort, 'executeStep'> {
  return proxyActivities<Pick<WorkflowActivitiesPort, 'executeStep'>>({
    startToCloseTimeout: '30m',
    cancellationType: ActivityCancellationType.TRY_CANCEL,
    retry: resolveStepActivityRetryPolicy(step),
  });
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
