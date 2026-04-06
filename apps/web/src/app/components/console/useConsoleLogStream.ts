import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useRunsService } from '../../services/AppServicesContext';
import { useExecutionStore } from '../../stores/executionStore';
import { queryKeys } from '../../queries/queryKeys';
import { formatRunEventAsLogLine } from './formatLogLine';

const LIVE_POLL_INTERVAL_MS = 2_000;

/**
 * Fetches run events for the active run, formats them as log lines,
 * and supports incremental polling for live runs.
 */
export function useConsoleLogStream(): {
  lines: string[];
  isLoading: boolean;
  runId: string | undefined;
} {
  const runsService = useRunsService();
  const currentRun = useExecutionStore((state) => state.currentRun);
  const runId = currentRun?.runId;

  const isLive = currentRun?.status === 'running' || currentRun?.status === 'pending';

  const [lines, setLines] = useState<string[]>([]);
  const afterSeqRef = useRef<number | undefined>(undefined);
  const lastRunIdRef = useRef<string | undefined>(undefined);

  const resetOnRunChange = useCallback(
    (currentRunId: string | undefined) => {
      if (currentRunId !== lastRunIdRef.current) {
        lastRunIdRef.current = currentRunId;
        afterSeqRef.current = undefined;
        setLines([]);
      }
    },
    []
  );

  useQuery({
    queryKey: queryKeys.runs.consoleLogStream(runId),
    queryFn: async () => {
      if (!runId) return { events: [], nextAfterSeq: undefined };

      resetOnRunChange(runId);

      const page = await runsService.listRunEvents(runId, afterSeqRef.current);

      if (page.events.length > 0) {
        const newLines = page.events.map(formatRunEventAsLogLine);
        setLines((prev) => [...prev, ...newLines]);
      }

      if (page.nextAfterSeq !== undefined) {
        afterSeqRef.current = page.nextAfterSeq;
      }

      return page;
    },
    enabled: Boolean(runId),
    refetchInterval: isLive ? LIVE_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
  });

  const isLoading = Boolean(runId) && lines.length === 0;

  return { lines, isLoading, runId };
}
