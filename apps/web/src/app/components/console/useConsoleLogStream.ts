/**
 * Owned concern: subscribe the shell console to the active run event stream
 * without owning snapshot truth or durable run-detail rendering.
 */
import { useMemo } from 'react';

import { useExecutionStore } from '../../stores/executionStore';
import { useRunEventFeedQuery } from '../../queries/runEventFeedQuery';
import {
  buildRunEventFeedHealthModel,
  type RunEventFeedHealthModel,
} from '../../services/runs/runEventFeedHealthModel';
import { formatRunEventAsLogLine } from './formatLogLine';

export function useConsoleLogStream(): {
  lines: string[];
  runId: string | undefined;
  health: RunEventFeedHealthModel;
  retry: () => void;
} {
  const currentRun = useExecutionStore((state) => state.currentRun);
  const runId = currentRun?.runId;

  const feedQuery = useRunEventFeedQuery(runId, { runStatus: currentRun?.status });
  const health = useMemo<RunEventFeedHealthModel>(() => {
    if (runId && feedQuery.isLoading && !feedQuery.data) {
      return { state: 'loading', events: [], canRetry: false };
    }

    return buildRunEventFeedHealthModel(feedQuery.data);
  }, [feedQuery.data, feedQuery.isLoading, runId]);

  const lines = useMemo(() => health.events.map(formatRunEventAsLogLine), [health.events]);

  return {
    lines,
    runId,
    health,
    retry: () => {
      void feedQuery.retryNow();
    },
  };
}
