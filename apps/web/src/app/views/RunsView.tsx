import { useEffect } from 'react';
import { useParams } from 'react-router';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import type { RunWorkspaceViewModel } from '../services/runs/runWorkspaceFacade';
import {
  RunDetailErrorState,
  RunDetailLoadingState,
  RunListState,
  RunMissingState,
  RunsEmptyState,
  RunsErrorState,
  RunWorkspaceState,
} from './runs/RunStates';
import { useExecutionStore } from '../stores/executionStore';
import type { Run } from '../types/dbt';
import { useRunWorkspace } from './runs/useRunWorkspace';
import { deriveRunsRouteBootstrapPresentation } from './runs/runsRouteBootstrap';
import { buildRunsWorkbenchState } from './runs/runWorkbenchStateModel';

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

  return {
    ...focusedRun,
    runtimeDetail: { level: 'snapshot' },
  } as Run;
}

export default function RunsView() {
  const { runId } = useParams();
  const setCurrentRun = useExecutionStore((state) => state.setCurrentRun);
  const {
    runs,
    isLoadingRuns,
    runsError,
    runsErrorMessage,
    workspace,
    isLoadingWorkspace,
    workspaceError,
    workspaceErrorMessage,
  } = useRunWorkspace(runId);

  const focusedRunModel = runId && workspace ? toFocusedRunModel(workspace) : null;

  useEffect(() => {
    setCurrentRun(focusedRunModel);
  }, [focusedRunModel, setCurrentRun]);

  useEffect(() => {
    return () => {
      setCurrentRun(null);
    };
  }, [setCurrentRun]);

  const state = buildRunsWorkbenchState({
    runId,
    runs,
    isLoadingRuns,
    runsError,
    runsErrorMessage,
    workspace,
    isLoadingWorkspace,
    workspaceError,
    workspaceErrorMessage,
  });
  usePublishedRouteBootstrap(deriveRunsRouteBootstrapPresentation(state));

  switch (state.kind) {
    case 'runs-error':
      return <RunsErrorState message={state.message} />;
    case 'runs-empty':
      return <RunsEmptyState />;
    case 'runs-list':
      return <RunListState runs={state.runs} isLoading={state.isLoading} />;
    case 'run-loading':
      return <RunDetailLoadingState runId={state.runId} />;
    case 'run-error':
      return <RunDetailErrorState runId={state.runId} message={state.message} />;
    case 'run-missing':
      return <RunMissingState runId={state.runId} />;
    case 'run-workspace':
      return <RunWorkspaceState workspace={state.workspace} />;
  }
}
