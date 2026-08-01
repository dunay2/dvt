/**
 * Owned concern: collapse the canonical feed state into the stable MVP health
 * vocabulary shared by Console and Runs presentation surfaces.
 */
import type { RunEvent } from '../../types/engine';
import type { RunEventFeedState } from './runEventFeedModel';

export type RunEventFeedHealthState =
  'idle' | 'loading' | 'live' | 'degraded' | 'complete' | 'failed';

export type RunEventFeedHealthModel = {
  readonly state: RunEventFeedHealthState;
  readonly events: readonly RunEvent[];
  readonly canRetry: boolean;
  readonly lastSuccessfulFetchAt?: string;
};

function projectHealthState(feed: RunEventFeedState): RunEventFeedHealthState {
  switch (feed.phase) {
    case 'idle':
      return 'idle';
    case 'initial-loading':
      return 'loading';
    case 'live':
      return 'live';
    case 'retrying':
    case 'stale':
    case 'terminal-draining':
      return 'degraded';
    case 'complete':
      return 'complete';
    case 'failed':
      return feed.events.length > 0 ? 'degraded' : 'failed';
  }
}

export function buildRunEventFeedHealthModel(
  feed: RunEventFeedState | undefined
): RunEventFeedHealthModel {
  if (!feed || feed.phase === 'idle') {
    return {
      state: 'idle',
      events: [],
      canRetry: false,
    };
  }

  return {
    state: projectHealthState(feed),
    events: feed.events,
    canRetry: feed.failure?.retryable === true,
    ...(feed.lastSuccessfulFetchAt === undefined
      ? {}
      : { lastSuccessfulFetchAt: feed.lastSuccessfulFetchAt }),
  };
}
