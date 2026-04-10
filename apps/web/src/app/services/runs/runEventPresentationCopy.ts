import type { RunEventHeadlineKey } from './runEventPresentationModel';

const RUN_EVENT_HEADLINE_COPY: Record<Exclude<RunEventHeadlineKey, 'fallback'>, string> = {
  runQueued: 'Run queued',
  runStarted: 'Run started',
  runPaused: 'Run paused',
  runResumed: 'Run resumed',
  runCancelRequested: 'Cancellation requested',
  runCancelled: 'Run cancelled',
  runCompleted: 'Run completed',
  runFailed: 'Run failed',
  stepStarted: 'Step started',
  stepCompleted: 'Step completed',
  stepFailed: 'Step failed',
  stepSkipped: 'Step skipped',
};

export function resolveRunEventHeadline(
  headlineKey: RunEventHeadlineKey,
  fallbackHeadline?: string | null
): string {
  if (headlineKey === 'fallback') {
    return fallbackHeadline ?? 'Unknown event';
  }

  return RUN_EVENT_HEADLINE_COPY[headlineKey];
}
