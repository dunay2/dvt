/**
 * Owned concern: adapt the ListRunEvents query rail to one shared,
 * cursor-backed React Query projection per run.
 */
import { useCallback } from 'react';
import { ContractValidationError } from '@dvt/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { UiRunStatus } from '../ports/runs';
import { ApiError } from '../services/api/createApiClient';
import { useRunsService } from '../services/AppServicesContext';
import {
  createRunEventFeedState,
  transitionRunEventFeed,
  type RunEventFeedFailure,
  type RunEventFeedState,
  type RunEventFeedTerminalEventType,
} from '../services/runs/runEventFeedModel';
import {
  isRunEventStreamLiveStatus,
  RUN_EVENT_LIVE_POLL_INTERVAL_MS,
} from '../services/runs/runEventTimelineModel';
import { queryKeys } from './queryKeys';

export type RunEventFeedQueryOptions = Readonly<{
  enabled?: boolean;
  runStatus?: UiRunStatus;
}>;

export class RunEventFeedInvariantError extends Error {
  constructor(disposition: string) {
    super(`Run event feed rejected a ListRunEvents result: ${disposition}`);
    this.name = 'RunEventFeedInvariantError';
  }
}

function startFeed(
  state: RunEventFeedState | undefined,
  runId: string,
  observedAt: string
): RunEventFeedState {
  return transitionRunEventFeed(state ?? createRunEventFeedState(), {
    type: 'start',
    runId,
    observedAt,
  }).state;
}

function readCursor(state: RunEventFeedState): number | undefined {
  return state.phase === 'idle' ? undefined : state.nextAfterSeq;
}

function terminalEventTypeForStatus(
  status: UiRunStatus | undefined
): RunEventFeedTerminalEventType | undefined {
  switch (status) {
    case 'cancelled':
      return 'RunCancelled';
    case 'completed':
      return 'RunCompleted';
    case 'failed':
      return 'RunFailed';
    default:
      return undefined;
  }
}

function prepareFeedForSnapshotStatus(
  state: RunEventFeedState | undefined,
  runId: string,
  runStatus: UiRunStatus | undefined,
  observedAt: string
): RunEventFeedState {
  const started = startFeed(state, runId, observedAt);
  const expectedEventType = terminalEventTypeForStatus(runStatus);
  if (!expectedEventType || started.phase === 'complete') {
    return started;
  }

  const transition = transitionRunEventFeed(started, {
    type: 'terminal-observed',
    runId,
    expectedEventType,
  });
  return transition.disposition === 'applied' ? transition.state : started;
}

export function classifyRunEventFeedFailure(error: unknown): RunEventFeedFailure {
  if (error instanceof RunEventFeedInvariantError) {
    return { kind: 'invariant', message: error.message, retryable: false };
  }

  if (error instanceof ContractValidationError) {
    return {
      kind: 'validation',
      message: error.message,
      retryable: false,
      statusCode: error.statusCode,
    };
  }

  if (!(error instanceof ApiError)) {
    return {
      kind: 'transport',
      message: error instanceof Error ? error.message : 'Run event transport failed.',
      retryable: true,
    };
  }

  const statusCode = error.statusCode ?? undefined;
  if (statusCode === 401 || statusCode === 403) {
    return { kind: 'authorization', message: error.message, retryable: false, statusCode };
  }
  if (statusCode === 404) {
    return { kind: 'missing-run', message: error.message, retryable: false, statusCode };
  }
  if (statusCode === 408 || statusCode === 425 || statusCode === 429 || (statusCode ?? 0) >= 500) {
    return { kind: 'transport', message: error.message, retryable: true, statusCode };
  }
  if (statusCode !== undefined) {
    return { kind: 'validation', message: error.message, retryable: false, statusCode };
  }

  return { kind: 'transport', message: error.message, retryable: true };
}

export function getRunEventFeedRefetchInterval(
  state: RunEventFeedState | undefined,
  runStatus: UiRunStatus | undefined,
  now = Date.now()
): number | false {
  if (!state || state.phase === 'idle' || state.phase === 'complete' || state.phase === 'failed') {
    return false;
  }

  if (state.nextRetryAt) {
    return Math.max(1, Date.parse(state.nextRetryAt) - now);
  }

  if (state.phase === 'retrying' || state.phase === 'stale') {
    return false;
  }

  return isRunEventStreamLiveStatus(runStatus) || terminalEventTypeForStatus(runStatus)
    ? RUN_EVENT_LIVE_POLL_INTERVAL_MS
    : false;
}

export function useRunEventFeedQuery(runId: string | undefined, options: RunEventFeedQueryOptions) {
  const runsService = useRunsService();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.runs.eventFeed(runId);

  const query = useQuery<RunEventFeedState>({
    queryKey,
    queryFn: async () => {
      if (!runId) {
        throw new RunEventFeedInvariantError('missing-run-id');
      }

      const attemptStartedAt = new Date().toISOString();
      const current = prepareFeedForSnapshotStatus(
        queryClient.getQueryData<RunEventFeedState>(queryKey),
        runId,
        options.runStatus,
        attemptStartedAt
      );
      if (current.phase === 'complete' || current.phase === 'failed') {
        return current;
      }

      try {
        const page = await runsService.listRunEvents(runId, readCursor(current));
        const observedAt = new Date().toISOString();
        const transition = transitionRunEventFeed(current, {
          type: 'page-received',
          runId,
          page,
          observedAt,
        });

        if (transition.disposition.startsWith('rejected-')) {
          throw new RunEventFeedInvariantError(transition.disposition);
        }
        return transition.state;
      } catch (error) {
        const observedAt = new Date().toISOString();
        const failure = classifyRunEventFeedFailure(error);
        const transition = failure.retryable
          ? transitionRunEventFeed(current, {
              type: 'transient-failure',
              runId,
              observedAt,
              failure,
            })
          : transitionRunEventFeed(current, {
              type: 'non-retryable-failure',
              runId,
              failure,
            });

        if (transition.disposition !== 'applied') {
          throw new RunEventFeedInvariantError(transition.disposition);
        }
        return transition.state;
      }
    },
    enabled: Boolean(runId) && (options.enabled ?? true),
    refetchInterval: ({ state }) => getRunEventFeedRefetchInterval(state.data, options.runStatus),
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: RUN_EVENT_LIVE_POLL_INTERVAL_MS,
  });

  const retryNow = useCallback(async () => {
    if (runId) {
      const current = queryClient.getQueryData<RunEventFeedState>(queryKey);
      if (current && current.phase !== 'idle') {
        const transition = transitionRunEventFeed(current, {
          type: 'retry-requested',
          runId,
        });
        if (transition.disposition === 'applied') {
          queryClient.setQueryData(queryKey, transition.state);
        }
      }
    }

    return query.refetch({ cancelRefetch: false });
  }, [query, queryClient, queryKey, runId]);

  return { ...query, retryNow };
}
