import { useEffect } from 'react';
import { useParams } from 'react-router';

import type { RunWorkspaceViewModel } from '../services/runs/runWorkspaceFacade';
import {
  RunDetailErrorState,
  RunDetailLoadingState,
  RunListState,
  RunNotFoundState,
  RunWorkspaceState,
} from './runs/RunStates';
import { useExecutionStore } from '../stores/executionStore';
import type { Run } from '../types/dbt';
import { useRunWorkspace } from './runs/useRunWorkspace';

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

  if (!runId) {
    return <RunListState runs={runs} isLoading={isLoadingRuns} />;
  }

  if (isLoadingWorkspace) {
    return <RunDetailLoadingState runId={runId} />;
  }

  if (workspaceError) {
    return <RunDetailErrorState runId={runId} message={workspaceErrorMessage} />;
  }

  if (!workspace) {
    return <RunNotFoundState runId={runId} />;
  }

  return <RunWorkspaceState workspace={workspace} />;
}
