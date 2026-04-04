import type { EventType, WorkflowSnapshot } from '@dvt/contracts';

export const TERMINAL_RUN_STATUSES = new Set<WorkflowSnapshot['status']>([
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export const TERMINAL_STEP_STATUSES = new Set<WorkflowSnapshot['steps'][string]['status']>([
  'COMPLETED',
  'SKIPPED',
]);

export const RUN_EVENT_ALLOWED_FROM: Partial<Record<EventType, WorkflowSnapshot['status'][]>> = {
  RunPaused: ['RUNNING'],
  RunResumed: ['PAUSED'],
  RunCancelRequested: ['RUNNING', 'PAUSED'],
};

export const STEP_EVENT_ALLOWED_FROM: Partial<
  Record<EventType, WorkflowSnapshot['steps'][string]['status'][]>
> = {
  StepStarted: ['PENDING', 'FAILED'],
  StepCompleted: ['RUNNING'],
  StepFailed: ['RUNNING'],
  StepSkipped: ['PENDING'],
};
