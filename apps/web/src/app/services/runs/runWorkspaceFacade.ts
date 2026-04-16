import { ApiError } from '../api/createApiClient';
import type { IRunsPort, RunSnapshot } from '../../ports/runs';
import type { RunEvent } from '../../types/engine';

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
  | 'unauthorized'
  | 'forbidden'
  | 'runtime-unavailable'
  | 'unexpected';

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

export interface RunWorkspaceFacade {
  loadRunWorkspace: (runId: string) => Promise<RunWorkspaceViewModel | null>;
}

function getStatusCode(error: ApiError): number | undefined {
  return typeof error.statusCode === 'number' ? error.statusCode : undefined;
}

function classifySnapshotError(error: unknown): RunWorkspaceLoadError {
  if (error instanceof ApiError) {
    const statusCode = getStatusCode(error);

    if (statusCode === 401) {
      return new RunWorkspaceLoadError('unauthorized', 'Authentication required', statusCode);
    }
    if (statusCode === 403) {
      return new RunWorkspaceLoadError('forbidden', 'Access denied for this run', statusCode);
    }
    if ((statusCode ?? 0) >= 500) {
      return new RunWorkspaceLoadError(
        'runtime-unavailable',
        'Runtime service is unavailable',
        statusCode
      );
    }
  }

  return new RunWorkspaceLoadError('unexpected', 'Unexpected runtime failure');
}

function describeTimelineError(error: unknown): { message: string; statusCode?: number } {
  if (error instanceof ApiError) {
    const statusCode = getStatusCode(error);

    if (statusCode === 401 || statusCode === 403) {
      return {
        message: 'Timeline is unavailable because access to event detail is denied.',
        statusCode,
      };
    }

    if ((statusCode ?? 0) >= 500) {
      return {
        message: 'Timeline is temporarily unavailable because runtime event service is degraded.',
        statusCode,
      };
    }

    return {
      message: `Timeline could not be loaded${statusCode ? ` (HTTP ${statusCode})` : ''}.`,
      statusCode,
    };
  }

  return { message: 'Timeline could not be loaded due to an unexpected error.' };
}

export function createRunWorkspaceFacade(runsService: IRunsPort): RunWorkspaceFacade {
  return {
    async loadRunWorkspace(runId: string): Promise<RunWorkspaceViewModel | null> {
      let snapshot: RunSnapshot | null;
      try {
        snapshot = await runsService.getRunSnapshot(runId);
      } catch (error) {
        throw classifySnapshotError(error);
      }

      if (snapshot === null) {
        return null;
      }

      try {
        const timelinePage = await runsService.listRunEvents(runId);
        const hasEvents = timelinePage.events.length > 0;
        return {
          runId: snapshot.runId,
          snapshot,
          timeline: hasEvents
            ? {
                state: 'available',
                events: timelinePage.events,
                nextAfterSeq: timelinePage.nextAfterSeq,
              }
            : {
                state: 'empty',
                events: [],
                nextAfterSeq: timelinePage.nextAfterSeq,
              },
          detailState: hasEvents ? 'snapshot-plus-events' : 'snapshot-only',
        };
      } catch (error) {
        const timelineError = describeTimelineError(error);
        return {
          runId: snapshot.runId,
          snapshot,
          timeline: {
            state: 'degraded',
            events: [],
            message: timelineError.message,
            statusCode: timelineError.statusCode,
          },
          detailState: 'snapshot-only',
        };
      }
    },
  };
}
