import type { RunEvent } from '../../types/engine';

const EVENT_LEVEL: Record<string, string> = {
  RunQueued: 'INFO',
  RunStarted: 'INFO',
  RunPaused: 'WARN',
  RunResumed: 'INFO',
  RunCancelRequested: 'WARN',
  RunCancelled: 'WARN',
  RunCompleted: 'SUCCESS',
  RunFailed: 'ERROR',
  StepStarted: 'INFO',
  StepCompleted: 'SUCCESS',
  StepFailed: 'ERROR',
  StepSkipped: 'WARN',
};

const EVENT_MESSAGE: Record<string, (event: RunEvent) => string> = {
  RunQueued: () => 'Run queued for execution',
  RunStarted: () => 'Run started',
  RunPaused: () => 'Run paused',
  RunResumed: () => 'Run resumed',
  RunCancelRequested: () => 'Cancellation requested',
  RunCancelled: () => 'Run cancelled',
  RunCompleted: () => 'Run completed successfully',
  RunFailed: (e) => `Run failed${e.payload?.message ? `: ${e.payload.message}` : ''}`,
  StepStarted: (e) => `Step ${e.stepId ?? 'unknown'} started`,
  StepCompleted: (e) => `Step ${e.stepId ?? 'unknown'} completed`,
  StepFailed: (e) =>
    `Step ${e.stepId ?? 'unknown'} failed${e.payload?.message ? `: ${e.payload.message}` : ''}`,
  StepSkipped: (e) => `Step ${e.stepId ?? 'unknown'} skipped`,
};

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString('en-GB', { hour12: false });
  } catch {
    return '??:??:??';
  }
}

export function formatRunEventAsLogLine(event: RunEvent): string {
  const time = formatTimestamp(event.emittedAt);
  const level = EVENT_LEVEL[event.eventType] ?? 'INFO';
  const messageFn = EVENT_MESSAGE[event.eventType];
  const message = messageFn ? messageFn(event) : `${event.eventType}`;
  return `${time}  [${level}]  ${message}`;
}

export function levelForEventType(eventType: string): string {
  return EVENT_LEVEL[eventType] ?? 'INFO';
}
