/**
 * Owned concern: subscribe the shell console to the active run event stream
 * without owning snapshot truth or durable run-detail rendering.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useRunsService } from '../../services/AppServicesContext';
import { useExecutionStore } from '../../stores/executionStore';
import { queryKeys } from '../../queries/queryKeys';
import { formatRunEventAsLogLine } from './formatLogLine';
import {
  isRunEventStreamLiveStatus,
  mergeRunEventTimelinePage,
  RUN_EVENT_LIVE_POLL_INTERVAL_MS,
} from '../../services/runs/runEventTimelineModel';
import type { RunEvent } from '../../types/engine';

export function useConsoleLogStream(): {
  lines: string[];
  isLoading: boolean;
  runId: string | undefined;
} {
  const runsService = useRunsService();
  const currentRun = useExecutionStore((state) => state.currentRun);
  const runId = currentRun?.runId;

  const isLive = isRunEventStreamLiveStatus(currentRun?.status);

  const [events, setEvents] = useState<RunEvent[]>([]);
  const afterSeqRef = useRef<number | undefined>(undefined);
  const lastRunIdRef = useRef<string | undefined>(undefined);

  const resetOnRunChange = useCallback((currentRunId: string | undefined) => {
    if (currentRunId !== lastRunIdRef.current) {
      lastRunIdRef.current = currentRunId;
      afterSeqRef.current = undefined;
      setEvents([]);
    }
  }, []);

  useQuery({
    queryKey: queryKeys.runs.consoleLogStream(runId),
    queryFn: async () => {
      if (!runId) return { events: [], nextAfterSeq: undefined };

      resetOnRunChange(runId);

      const page = await runsService.listRunEvents(runId, afterSeqRef.current);

      setEvents((previousEvents) => {
        const merged = mergeRunEventTimelinePage(
          { events: previousEvents, nextAfterSeq: afterSeqRef.current },
          page
        );
        afterSeqRef.current = merged.nextAfterSeq;
        return [...merged.events];
      });

      return page;
    },
    enabled: Boolean(runId),
    refetchInterval: isLive ? RUN_EVENT_LIVE_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
  });

  const lines = useMemo(() => events.map(formatRunEventAsLogLine), [events]);
  const isLoading = Boolean(runId) && events.length === 0;

  return { lines, isLoading, runId };
}
