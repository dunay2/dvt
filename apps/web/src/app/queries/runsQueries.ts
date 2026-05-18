import { useQuery } from '@tanstack/react-query';
import type { RunSnapshot, RunSummaryItem, UiRunStatus } from '../ports/runs';
import { useRunsService } from '../services/AppServicesContext';
import type {
  RunWorkspaceFacade,
  RunWorkspaceViewModel,
} from '../services/runs/runWorkspaceFacade';
import { queryKeys } from './queryKeys';

export const RUNS_STATUS_REFRESH_INTERVAL_MS = 5_000;

type QueryStateReader<TData> = {
  state: {
    data: TData | undefined;
  };
};

export function getRunStatusRefreshInterval(status: UiRunStatus | undefined): number | false {
  return status === 'pending' || status === 'running' ? RUNS_STATUS_REFRESH_INTERVAL_MS : false;
}

function getRunSummariesRefreshInterval(query: QueryStateReader<RunSummaryItem[]>): number | false {
  return query.state.data?.some((run) => getRunStatusRefreshInterval(run.status) !== false)
    ? RUNS_STATUS_REFRESH_INTERVAL_MS
    : false;
}

function getRunSnapshotRefreshInterval(
  query: QueryStateReader<RunSnapshot | null>
): number | false {
  return getRunStatusRefreshInterval(query.state.data?.status);
}

function getRunWorkspaceRefreshInterval(
  query: QueryStateReader<RunWorkspaceViewModel | null>
): number | false {
  return getRunStatusRefreshInterval(query.state.data?.snapshot.status);
}

export function useRunsListForViewQuery(viewId: string) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.list(viewId),
    queryFn: () => runsService.listRunSummaries(),
    refetchInterval: getRunSummariesRefreshInterval,
  });
}

export function useScopedRunSummariesQuery(workspaceLayoutKey: string) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.summaries(workspaceLayoutKey),
    queryFn: () => runsService.listRunSummaries(),
    refetchInterval: getRunSummariesRefreshInterval,
  });
}

export function useScopedRunSummariesQueryForHistory(workspaceLayoutKey: string, enabled: boolean) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.summaries(workspaceLayoutKey),
    queryFn: () => runsService.listRunSummaries(),
    enabled,
    staleTime: 30_000,
  });
}

export function useRunSnapshotQuery(workspaceLayoutKey: string, runId: string | undefined) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.snapshot(workspaceLayoutKey, runId),
    queryFn: () => runsService.getRunSnapshot(runId!),
    enabled: Boolean(runId),
    refetchInterval: getRunSnapshotRefreshInterval,
    staleTime: 5_000,
  });
}

export function useRunWorkspaceQuery(
  workspaceLayoutKey: string,
  runId: string | undefined,
  runWorkspaceFacade: RunWorkspaceFacade
) {
  return useQuery<RunWorkspaceViewModel | null>({
    queryKey: queryKeys.runs.workspace(workspaceLayoutKey, runId),
    queryFn: () => runWorkspaceFacade.loadRunWorkspace(runId ?? ''),
    enabled: Boolean(runId),
    refetchInterval: getRunWorkspaceRefreshInterval,
  });
}
