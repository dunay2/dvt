import { useQuery } from '@tanstack/react-query';
import { useMemo, useSyncExternalStore } from 'react';

import type { IRunsPort, RunSummaryItem } from '../../ports/runs';
import { queryKeys } from '../../queries/queryKeys';
import { useScopedRunSummariesQuery } from '../../queries/runsQueries';
import { useRunsService, useSessionContext } from '../../services/AppServicesContext';
import {
  createRunWorkspaceFacade,
  RunWorkspaceLoadError,
  type RunWorkspaceViewModel,
} from '../../services/runs/runWorkspaceFacade';

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
  const sessionContext = useSessionContext();
  const runWorkspaceFacade = useMemo(() => createRunWorkspaceFacade(runsService), [runsService]);

  const { tenantId, projectId, environmentId } = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );
  const workspaceLayoutKey = buildWorkspaceLayoutKey(tenantId, projectId, environmentId);

  const runsQuery = useScopedRunSummariesQuery(workspaceLayoutKey);

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
