import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { IRunsPort, RunSummaryItem } from '../../ports/runs';
import { queryKeys } from '../../queries/queryKeys';
import {
  createRunWorkspaceFacade,
  RunWorkspaceLoadError,
  type RunWorkspaceViewModel,
} from '../../services/runs/runWorkspaceFacade';
import { useRunsService } from '../../services/AppServicesContext';
import { useSessionStore } from '../../stores/sessionStore';

function buildWorkspaceLayoutKey(tenantId: string, projectId: string, environmentId: string) {
  return `${tenantId}::${projectId}::${environmentId}`;
}

type UseRunWorkspaceResult = {
  runs: RunSummaryItem[];
  isLoadingRuns: boolean;
  workspace: RunWorkspaceViewModel | null | undefined;
  isLoadingWorkspace: boolean;
  workspaceError: Error | null;
  isWorkspaceLoadError: boolean;
  workspaceErrorMessage: string;
};

export function useRunWorkspace(runId: string | undefined): UseRunWorkspaceResult {
  const runsService: IRunsPort = useRunsService();
  const runWorkspaceFacade = useMemo(() => createRunWorkspaceFacade(runsService), [runsService]);

  const tenantId = useSessionStore((state) => state.tenantId);
  const projectId = useSessionStore((state) => state.projectId);
  const environmentId = useSessionStore((state) => state.environmentId);
  const workspaceLayoutKey = buildWorkspaceLayoutKey(tenantId, projectId, environmentId);

  const runsQuery = useQuery({
    queryKey: queryKeys.runs.summaries(workspaceLayoutKey),
    queryFn: () => runsService.listRunSummaries(),
  });

  const runWorkspaceQuery = useQuery({
    queryKey: queryKeys.runs.workspace(workspaceLayoutKey, runId),
    queryFn: () => runWorkspaceFacade.loadRunWorkspace(runId ?? ''),
    enabled: Boolean(runId),
  });

  const workspaceQueryError = runWorkspaceQuery.error;
  const isWorkspaceLoadError = workspaceQueryError instanceof RunWorkspaceLoadError;
  const workspaceErrorMessage = isWorkspaceLoadError
    ? workspaceQueryError.message
    : 'Run workspace could not be loaded.';

  return {
    runs: runsQuery.data ?? [],
    isLoadingRuns: runsQuery.isLoading,
    workspace: runWorkspaceQuery.data,
    isLoadingWorkspace: runWorkspaceQuery.isLoading,
    workspaceError: runWorkspaceQuery.error,
    isWorkspaceLoadError,
    workspaceErrorMessage,
  };
}
