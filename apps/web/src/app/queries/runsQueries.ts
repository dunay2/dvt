import { useQuery } from '@tanstack/react-query';
import { useRunsService } from '../services/AppServicesContext';
import type {
  RunWorkspaceFacade,
  RunWorkspaceViewModel,
} from '../services/runs/runWorkspaceFacade';
import { queryKeys } from './queryKeys';

export function useRunsListForViewQuery(viewId: string) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.list(viewId),
    queryFn: () => runsService.listRunSummaries(),
  });
}

export function useScopedRunSummariesQuery(workspaceLayoutKey: string) {
  const runsService = useRunsService();
  return useQuery({
    queryKey: queryKeys.runs.summaries(workspaceLayoutKey),
    queryFn: () => runsService.listRunSummaries(),
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
  });
}
