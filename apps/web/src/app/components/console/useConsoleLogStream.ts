/**
 * Owned concern: subscribe the shell console to the active run event stream
 * without owning snapshot truth or durable run-detail rendering.
 */
import { useMemo } from 'react';

import { useExecutionStore } from '../../stores/executionStore';
import { useRunEventFeedQuery } from '../../queries/runEventFeedQuery';
import { formatRunEventAsLogLine } from './formatLogLine';
import { isRunEventStreamLiveStatus } from '../../services/runs/runEventTimelineModel';

export function useConsoleLogStream(): {
  lines: string[];
  isLoading: boolean;
  runId: string | undefined;
} {
  const currentRun = useExecutionStore((state) => state.currentRun);
  const runId = currentRun?.runId;

  const isLive = isRunEventStreamLiveStatus(currentRun?.status);
  const feedQuery = useRunEventFeedQuery(runId, { isLive });
  const events = feedQuery.data?.phase === 'idle' ? [] : (feedQuery.data?.events ?? []);

  const lines = useMemo(() => events.map(formatRunEventAsLogLine), [events]);
  const isLoading = Boolean(runId) && feedQuery.isLoading;

  return { lines, isLoading, runId };
}
