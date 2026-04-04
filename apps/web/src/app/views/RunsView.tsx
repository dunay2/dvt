import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router';

import { useRunsService } from '../services/AppServicesContext';
import {
  createRunWorkspaceFacade,
  RunWorkspaceLoadError,
  type RunWorkspaceViewModel,
} from '../services/runs/runWorkspaceFacade';
import {
  RunDetailErrorState,
  RunDetailLoadingState,
  RunListState,
  RunNotFoundState,
  RunWorkspaceState,
} from './runs/RunStates';
import { useSessionStore } from '../stores/sessionStore';
import { useAppStore } from '../stores/appStore';
import type { Run } from '../types/dbt';

function toFocusedRunModel(workspace: RunWorkspaceViewModel): Run {
  const { snapshot } = workspace;
  const completedAtMs =
    typeof snapshot.completedAt === 'string' ? Date.parse(snapshot.completedAt) : undefined;
  const startedAtMs = Date.parse(snapshot.startedAt);
  const durationSeconds =
    completedAtMs != null && Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs)
      ? Math.max(0, (completedAtMs - startedAtMs) / 1000)
      : undefined;

  const focusedRun: Run = {
    runId: snapshot.runId,
    planId: snapshot.planId ?? 'unknown-plan',
    status: snapshot.status,
    environment: snapshot.environment ?? 'unknown',
    gitSha: snapshot.gitSha ?? 'unknown',
    startTime: snapshot.startedAt,
    endTime: snapshot.completedAt,
    duration: durationSeconds,
    events: [],
    steps: [],
  };

  // Explicitly mark this as snapshot-level runtime data so plugin mappers
  // that require step/event detail can skip canonical conversion.
  return {
    ...focusedRun,
    runtimeDetail: { level: 'snapshot' },
  } as Run;
}

export default function RunsView() {
  const { runId } = useParams();
  const runsService = useRunsService();
  const { setCurrentRun } = useAppStore();
  const runWorkspaceFacade = useMemo(() => createRunWorkspaceFacade(runsService), [runsService]);
  const tenantId = useSessionStore((state) => state.tenantId);
  const projectId = useSessionStore((state) => state.projectId);
  const environmentId = useSessionStore((state) => state.environmentId);
  const workspaceLayoutKey = `${tenantId}::${projectId}::${environmentId}`;

  const runsQuery = useQuery({
    queryKey: ['runs', 'summaries', workspaceLayoutKey],
    queryFn: () => runsService.listRunSummaries(),
  });

  const runWorkspaceQuery = useQuery({
    queryKey: ['runs', 'workspace', workspaceLayoutKey, runId],
    queryFn: () => runWorkspaceFacade.loadRunWorkspace(runId ?? ''),
    enabled: Boolean(runId),
  });

  const workspace = runWorkspaceQuery.data;
  const focusedRunModel = runId && workspace ? toFocusedRunModel(workspace) : null;

  useEffect(() => {
    setCurrentRun(focusedRunModel);
  }, [focusedRunModel, setCurrentRun]);

  useEffect(() => {
    return () => {
      setCurrentRun(null);
    };
  }, [setCurrentRun]);

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

  if (!workspace) {
    return <RunNotFoundState runId={runId} />;
  }

  return <RunWorkspaceState workspace={workspace} />;
}
