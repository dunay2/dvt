/**
 * Owned concern: own the runs workspace data-fetching lifecycle as a composable
 * hook for route consumers.
 */
import { useMemo, useSyncExternalStore } from 'react';

import type { RunSummaryItem } from '../../ports/runs';
import { useRunEventFeedQuery } from '../../queries/runEventFeedQuery';
import { useRunSnapshotQuery, useScopedRunSummariesQuery } from '../../queries/runsQueries';
import { classifyHttpError, extractHttpStatusCode } from '../../services/api/classifyHttpError';
import { useSessionContext } from '../../services/AppServicesContext';
import {
  buildRunWorkspaceViewModel,
  classifyRunWorkspaceSnapshotError,
  type RunWorkspaceViewModel,
} from '../../services/runs/runWorkspaceModel';
import { isRunEventStreamLiveStatus } from '../../services/runs/runEventTimelineModel';

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
  const sessionContext = useSessionContext();

  const { tenantId, projectId, environmentId } = useSyncExternalStore(
    sessionContext.subscribeWorkspaceScope,
    sessionContext.getWorkspaceScopeSnapshot,
    sessionContext.getWorkspaceScopeSnapshot
  );
  const workspaceLayoutKey = buildWorkspaceLayoutKey(tenantId, projectId, environmentId);

  const runsQuery = useScopedRunSummariesQuery(workspaceLayoutKey);
  const runsErrorMessage = describeRunsListError(runsQuery.error);

  const snapshotQuery = useRunSnapshotQuery(workspaceLayoutKey, runId);
  const canLoadEvents = Boolean(runId) && snapshotQuery.isFetched && snapshotQuery.data != null;
  const eventFeedQuery = useRunEventFeedQuery(runId, {
    enabled: canLoadEvents,
    isLive: isRunEventStreamLiveStatus(snapshotQuery.data?.status),
  });
  const workspaceError = useMemo(
    () => (snapshotQuery.error ? classifyRunWorkspaceSnapshotError(snapshotQuery.error) : null),
    [snapshotQuery.error]
  );
  const workspace = useMemo(() => {
    if (snapshotQuery.data == null) {
      return snapshotQuery.data;
    }

    return buildRunWorkspaceViewModel(
      snapshotQuery.data,
      eventFeedQuery.data,
      eventFeedQuery.error
    );
  }, [eventFeedQuery.data, eventFeedQuery.error, snapshotQuery.data]);

  return {
    runs: runsQuery.data ?? [],
    isLoadingRuns: runsQuery.isLoading,
    runsError: runsQuery.error,
    runsErrorMessage,
    workspace,
    isLoadingWorkspace: snapshotQuery.isLoading || (canLoadEvents && eventFeedQuery.isLoading),
    workspaceError,
    workspaceErrorMessage: workspaceError?.message ?? 'Run workspace could not be loaded.',
  };
}
