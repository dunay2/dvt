/**
 * Owned concern: compose an authoritative run snapshot and the canonical
 * shared event feed into the Runs workbench read model.
 */
import type { RunSnapshot } from '../../ports/runs';
import type { RunEvent } from '../../types/engine';
import { classifyHttpError, extractHttpStatusCode } from '../api/classifyHttpError';
import type { RunEventFeedState } from './runEventFeedModel';

export type RunWorkspaceTimeline =
  | {
      state: 'available';
      events: RunEvent[];
      nextAfterSeq?: number;
    }
  | {
      state: 'empty';
      events: [];
      nextAfterSeq?: number;
    }
  | {
      state: 'degraded';
      events: RunEvent[];
      nextAfterSeq?: number;
      message: string;
      statusCode?: number;
    };

export type RunWorkspaceViewModel = {
  runId: string;
  snapshot: RunSnapshot;
  timeline: RunWorkspaceTimeline;
  detailState: 'snapshot-only' | 'snapshot-plus-events';
};

export type RunWorkspaceLoadErrorKind =
  'unauthorized' | 'forbidden' | 'runtime-unavailable' | 'unexpected';

export class RunWorkspaceLoadError extends Error {
  readonly kind: RunWorkspaceLoadErrorKind;
  readonly statusCode?: number;

  constructor(kind: RunWorkspaceLoadErrorKind, message: string, statusCode?: number) {
    super(message);
    this.kind = kind;
    this.statusCode = statusCode;
    this.name = 'RunWorkspaceLoadError';
  }
}

export function classifyRunWorkspaceSnapshotError(error: unknown): RunWorkspaceLoadError {
  const kind = classifyHttpError(error);
  const statusCode = extractHttpStatusCode(error);

  switch (kind) {
    case 'auth-required':
      return new RunWorkspaceLoadError('unauthorized', 'Authentication required', statusCode);
    case 'access-denied':
      return new RunWorkspaceLoadError('forbidden', 'Access denied for this run', statusCode);
    case 'service-unavailable':
      return new RunWorkspaceLoadError(
        'runtime-unavailable',
        'Runtime service is unavailable',
        statusCode
      );
    default:
      return new RunWorkspaceLoadError('unexpected', 'Unexpected runtime failure');
  }
}

function describeTimelineError(error: unknown): { message: string; statusCode?: number } {
  const kind = classifyHttpError(error);
  const statusCode = extractHttpStatusCode(error);

  switch (kind) {
    case 'auth-required':
    case 'access-denied':
      return {
        message: 'Timeline is unavailable because access to event detail is denied.',
        statusCode,
      };
    case 'service-unavailable':
      return {
        message: 'Timeline is temporarily unavailable because runtime event service is degraded.',
        statusCode,
      };
    case 'client-error':
      return {
        message: `Timeline could not be loaded${statusCode ? ` (HTTP ${statusCode})` : ''}.`,
        statusCode,
      };
    default:
      return { message: 'Timeline could not be loaded due to an unexpected error.' };
  }
}

function readFeedSnapshot(feed: RunEventFeedState | undefined): {
  events: RunEvent[];
  nextAfterSeq?: number;
} {
  if (!feed || feed.phase === 'idle') {
    return { events: [] };
  }

  return {
    events: [...feed.events],
    ...(feed.nextAfterSeq === undefined ? {} : { nextAfterSeq: feed.nextAfterSeq }),
  };
}

export function buildRunWorkspaceViewModel(
  snapshot: RunSnapshot,
  feed: RunEventFeedState | undefined,
  feedError?: unknown
): RunWorkspaceViewModel {
  const timelineSnapshot = readFeedSnapshot(feed);
  const hasEvents = timelineSnapshot.events.length > 0;
  let timeline: RunWorkspaceTimeline;

  if (feed && feed.phase !== 'idle' && feed.failure) {
    timeline = {
      state: 'degraded',
      ...timelineSnapshot,
      message: feed.failure.message,
      ...(feed.failure.statusCode === undefined ? {} : { statusCode: feed.failure.statusCode }),
    };
  } else if (feedError) {
    const error = describeTimelineError(feedError);
    timeline = {
      state: 'degraded',
      ...timelineSnapshot,
      message: error.message,
      ...(error.statusCode === undefined ? {} : { statusCode: error.statusCode }),
    };
  } else if (hasEvents) {
    timeline = { state: 'available', ...timelineSnapshot };
  } else {
    timeline = {
      state: 'empty',
      events: [],
      ...(timelineSnapshot.nextAfterSeq === undefined
        ? {}
        : { nextAfterSeq: timelineSnapshot.nextAfterSeq }),
    };
  }

  return {
    runId: snapshot.runId,
    snapshot,
    timeline,
    detailState: hasEvents ? 'snapshot-plus-events' : 'snapshot-only',
  };
}
