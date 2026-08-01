/**
 * Owned concern: compose an authoritative run snapshot and the canonical
 * shared event feed into the Runs workbench read model.
 */
import type { RunSnapshot } from '../../ports/runs';
import type { RunEvent } from '../../types/engine';
import { classifyHttpError, extractHttpStatusCode } from '../api/classifyHttpError';
import type { RunEventFeedState } from './runEventFeedModel';
import {
  buildRunEventFeedHealthModel,
  type RunEventFeedHealthModel,
} from './runEventFeedHealthModel';

export type RunWorkspaceTimeline =
  | {
      state: 'available';
      events: RunEvent[];
      nextAfterSeq?: number;
    }
  | {
      state: 'unresolved';
      events: [];
    }
  | {
      state: 'empty';
      events: [];
      nextAfterSeq?: number;
    };

export type RunWorkspaceViewModel = {
  runId: string;
  snapshot: RunSnapshot;
  eventFeedHealth: RunEventFeedHealthModel;
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
  const hasSuccessfulFeedResponse =
    feed !== undefined && feed.phase !== 'idle' && feed.lastSuccessfulFetchAt !== undefined;
  const projectedHealth = buildRunEventFeedHealthModel(feed);
  const eventFeedHealth: RunEventFeedHealthModel = feedError
    ? {
        ...projectedHealth,
        state: hasEvents ? 'degraded' : 'failed',
        canRetry: false,
      }
    : projectedHealth;
  let timeline: RunWorkspaceTimeline;

  if (hasEvents) {
    timeline = { state: 'available', ...timelineSnapshot };
  } else if (hasSuccessfulFeedResponse) {
    timeline = {
      state: 'empty',
      events: [],
      ...(timelineSnapshot.nextAfterSeq === undefined
        ? {}
        : { nextAfterSeq: timelineSnapshot.nextAfterSeq }),
    };
  } else {
    timeline = { state: 'unresolved', events: [] };
  }

  return {
    runId: snapshot.runId,
    snapshot,
    eventFeedHealth,
    timeline,
    detailState: hasEvents ? 'snapshot-plus-events' : 'snapshot-only',
  };
}
