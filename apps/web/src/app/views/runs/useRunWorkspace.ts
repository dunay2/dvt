import { useQuery } from '@tanstack/react-query';
import { useMemo, useSyncExternalStore } from 'react';

import type { IRunsPort, RunSummaryItem } from '../../ports/runs';
import { queryKeys } from '../../queries/queryKeys';
import { ApiError } from '../../services/api/createApiClient';
import { useRunsService, useSessionContext } from '../../services/AppServicesContext';
import { useScopedRunSummariesQuery } from '../../queries/runsQueries';
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
  runsError: Error | null;
  runsErrorMessage: string;
  workspace: RunWorkspaceViewModel | null | undefined;
  isLoadingWorkspace: boolean;
  workspaceError: Error | null;
  isWorkspaceLoadError: boolean;
  workspaceErrorMessage: string;
};

function describeRunsListError(error: Error | null): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      return 'Authentication required';
    }

    if (error.statusCode === 403) {
      return 'Access denied for runs list';
    }

    if ((error.statusCode ?? 0) >= 500) {
      return 'Runtime service is unavailable';
    }

    return `Runs could not be loaded${error.statusCode ? ` (HTTP ${error.statusCode})` : ''}.`;
  }

  return error ? 'Runs could not be loaded due to an unexpected error.' : '';
}

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
  const runsErrorMessage = describeRunsListError(runsQuery.error);

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
    runsError: runsQuery.error,
    runsErrorMessage,
    workspace: runWorkspaceQuery.data,
    isLoadingWorkspace: runWorkspaceQuery.isLoading,
    workspaceError: runWorkspaceQuery.error,
    isWorkspaceLoadError,
    workspaceErrorMessage,
  };
}
