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
import {
  deriveRunsRouteBootstrapPresentation,
  RUN_DETAIL_ROUTE_ID,
  RUNS_ROUTE_ID,
} from './runs/runsRouteBootstrap';
import { buildRunsWorkbenchState } from './runs/runWorkbenchStateModel';

type RunsWorkbenchSurfaceProps = Readonly<{
  resolveRouteBootstrapId: (runId: string | undefined) => string;
}>;

function toFocusedRunModel(workspace: RunWorkspaceViewModel): Run | null {
  const { snapshot } = workspace;
  if (!snapshot.planId || !snapshot.environment) {
    return null;
  }

  const focusedRun: Run = {
    runId: snapshot.runId,
    planId: snapshot.planId,
    status: snapshot.status,
    environment: snapshot.environment,
    gitSha: snapshot.gitSha,
    startTime: snapshot.startedAt,
    endTime: snapshot.completedAt,
    duration: snapshot.durationMs === undefined ? undefined : snapshot.durationMs / 1000,
    events: [],
    steps: [],
  };

  return {
    ...focusedRun,
    runtimeDetail: { level: 'snapshot' },
  } as Run;
}

export function RunsWorkbenchSurface({ resolveRouteBootstrapId }: RunsWorkbenchSurfaceProps) {
  const { runId } = useParams();
  const setCurrentRun = useExecutionStore((state) => state.setCurrentRun);
  const observedRunId = useExecutionStore((state) => state.currentRun?.runId);
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
    if (focusedRunModel) {
      setCurrentRun(focusedRunModel);
      return;
    }

    if (
      runId &&
      observedRunId &&
      (observedRunId !== runId || (workspace !== null && focusedRunModel === null))
    ) {
      setCurrentRun(null);
    }
  }, [focusedRunModel, observedRunId, runId, setCurrentRun, workspace]);

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
  usePublishedRouteBootstrap(
    resolveRouteBootstrapId(runId),
    deriveRunsRouteBootstrapPresentation(state)
  );

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

export default function RunsView() {
  return (
    <RunsWorkbenchSurface
      resolveRouteBootstrapId={(runId) => (runId ? RUN_DETAIL_ROUTE_ID : RUNS_ROUTE_ID)}
    />
  );
}
