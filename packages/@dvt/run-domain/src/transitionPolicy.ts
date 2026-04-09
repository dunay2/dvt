import type { WorkflowSnapshot } from '@dvt/contracts';

export const TERMINAL_RUN_STATUSES = new Set<WorkflowSnapshot['status']>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const TERMINAL_STEP_STATUSES = new Set<WorkflowSnapshot['steps'][string]['status']>([
  'COMPLETED',
  'SKIPPED',
]);

export type GuardedRunEventType = 'RunPaused' | 'RunResumed' | 'RunCancelRequested';

export type GuardedStepEventType = 'StepStarted' | 'StepCompleted' | 'StepFailed' | 'StepSkipped';

export const RUN_EVENT_ALLOWED_FROM: Record<GuardedRunEventType, WorkflowSnapshot['status'][]> = {
  RunPaused: ['RUNNING'],
  RunResumed: ['PAUSED'],
  RunCancelRequested: ['PENDING', 'RUNNING', 'PAUSED'],
};

export const STEP_EVENT_ALLOWED_FROM: Record<
  GuardedStepEventType,
  WorkflowSnapshot['steps'][string]['status'][]
> = {
  StepStarted: ['PENDING', 'FAILED'],
  StepCompleted: ['RUNNING'],
  StepFailed: ['RUNNING'],
  StepSkipped: ['PENDING'],
};
