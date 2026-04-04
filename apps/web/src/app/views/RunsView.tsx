import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useParams } from 'react-router';

import { resolveDataSource } from '../services/config/dataSource';
import {
  createRunWorkspaceFacade,
  RunWorkspaceLoadError,
} from '../services/runs/runWorkspaceFacade';
import { createRunsService } from '../services/runs/runsService';
import {
  RunDetailErrorState,
  RunDetailLoadingState,
  RunListState,
  RunNotFoundState,
  RunWorkspaceState,
} from './runs/RunStates';

export default function RunsView() {
  const { runId } = useParams();
  const runsService = useMemo(() => createRunsService(resolveDataSource()), []);
  const runWorkspaceFacade = useMemo(() => createRunWorkspaceFacade(runsService), [runsService]);

  const runsQuery = useQuery({
    queryKey: ['runs', 'summaries'],
    queryFn: () => runsService.listRunSummaries(),
  });

  const runWorkspaceQuery = useQuery({
    queryKey: ['runs', 'workspace', runId],
    queryFn: () => runWorkspaceFacade.loadRunWorkspace(runId ?? ''),
    enabled: Boolean(runId),
  });

  if (!runId) {
    return <RunListState runs={runsQuery.data ?? []} isLoading={runsQuery.isLoading} />;
  }

  if (runWorkspaceQuery.isLoading) {
    return <RunDetailLoadingState runId={runId} />;
  }

  if (runWorkspaceQuery.isError) {
    const errorMessage =
      runWorkspaceQuery.error instanceof RunWorkspaceLoadError
        ? runWorkspaceQuery.error.message
        : 'Run workspace could not be loaded.';
    return <RunDetailErrorState runId={runId} message={errorMessage} />;
  }

  const workspace = runWorkspaceQuery.data;

  if (!workspace) {
    return <RunNotFoundState runId={runId} />;
  }

  return <RunWorkspaceState workspace={workspace} />;
}
