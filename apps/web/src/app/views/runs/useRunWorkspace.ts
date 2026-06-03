/**
 * Owned concern: own the runs workspace data-fetching lifecycle as a composable
 * hook for route consumers.
 */
import { useMemo, useSyncExternalStore } from 'react';

import type { IRunsPort, RunSummaryItem } from '../../ports/runs';
import { useRunWorkspaceQuery, useScopedRunSummariesQuery } from '../../queries/runsQueries';
import { classifyHttpError, extractHttpStatusCode } from '../../services/api/classifyHttpError';
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
  runsError: Error | null;
  runsErrorMessage: string;
  workspace: RunWorkspaceViewModel | null | undefined;
  isLoadingWorkspace: boolean;
  workspaceError: Error | null;
  isWorkspaceLoadError: boolean;
  workspaceErrorMessage: string;
};

function describeRunsListError(error: Error | null): string {
  if (!error) {
    return '';
  }

  const kind = classifyHttpError(error);

  switch (kind) {
    case 'auth-required':
      return 'Authentication required';
    case 'access-denied':
      return 'Access denied for runs list';
    case 'service-unavailable':
      return 'Runtime service is unavailable';
    case 'client-error': {
      const statusCode = extractHttpStatusCode(error);
      return `Runs could not be loaded${statusCode ? ` (HTTP ${statusCode})` : ''}.`;
    }
    default:
      return 'Runs could not be loaded due to an unexpected error.';
  }
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

  const runWorkspaceQuery = useRunWorkspaceQuery(workspaceLayoutKey, runId, runWorkspaceFacade);

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
