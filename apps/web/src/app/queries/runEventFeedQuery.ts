/**
 * Owned concern: adapt the ListRunEvents query rail to one shared,
 * cursor-backed React Query projection per run.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useRunsService } from '../services/AppServicesContext';
import {
  createRunEventFeedState,
  transitionRunEventFeed,
  type RunEventFeedState,
} from '../services/runs/runEventFeedModel';
import { RUN_EVENT_LIVE_POLL_INTERVAL_MS } from '../services/runs/runEventTimelineModel';
import { queryKeys } from './queryKeys';

export type RunEventFeedQueryOptions = Readonly<{
  isLive: boolean;
  enabled?: boolean;
}>;

export class RunEventFeedInvariantError extends Error {
  constructor(disposition: string) {
    super(`Run event feed rejected a ListRunEvents result: ${disposition}`);
    this.name = 'RunEventFeedInvariantError';
  }
}

function startFeed(state: RunEventFeedState | undefined, runId: string): RunEventFeedState {
  return transitionRunEventFeed(state ?? createRunEventFeedState(), {
    type: 'start',
    runId,
  }).state;
}

function readCursor(state: RunEventFeedState): number | undefined {
  return state.phase === 'idle' ? undefined : state.nextAfterSeq;
}

export function useRunEventFeedQuery(runId: string | undefined, options: RunEventFeedQueryOptions) {
  const runsService = useRunsService();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.runs.eventFeed(runId);

  return useQuery<RunEventFeedState>({
    queryKey,
    queryFn: async () => {
      if (!runId) {
        throw new RunEventFeedInvariantError('missing-run-id');
      }

      const current = startFeed(queryClient.getQueryData<RunEventFeedState>(queryKey), runId);
      const page = await runsService.listRunEvents(runId, readCursor(current));
      const transition = transitionRunEventFeed(current, {
        type: 'page-received',
        runId,
        page,
        observedAt: new Date().toISOString(),
      });

      if (transition.disposition.startsWith('rejected-')) {
        throw new RunEventFeedInvariantError(transition.disposition);
      }

      return transition.state;
    },
    enabled: Boolean(runId) && (options.enabled ?? true),
    refetchInterval: options.isLive ? RUN_EVENT_LIVE_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
    staleTime: RUN_EVENT_LIVE_POLL_INTERVAL_MS,
  });
}
