import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import type { RunWorkspaceViewModel } from '../services/runs/runWorkspaceModel';
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
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { useRunsService } from '../services/AppServicesContext';
import type { ExecutionStep, NodeStatus, Run } from '../types/dbt';
import type { PlanViewModel } from '../types/plans';
import { useRunWorkspace } from './runs/useRunWorkspace';
import {
  deriveRunsRouteBootstrapPresentation,
  RUN_DETAIL_ROUTE_ID,
  RUNS_ROUTE_ID,
} from './runs/runsRouteBootstrap';
import { buildRunsWorkbenchState } from './runs/runWorkbenchStateModel';
import { useRunControlCommands } from './runs/useRunControlCommands';

type RunsWorkbenchSurfaceProps = Readonly<{
  resolveRouteBootstrapId: (runId: string | undefined) => string;
}>;

function toExecutionStepType(type: string): ExecutionStep['type'] {
  switch (type) {
    case 'DBT_COMPILE':
    case 'DBT_RUN':
    case 'DBT_TEST':
    case 'CUSTOM_PLUGIN_STEP':
      return type;
    default:
      return 'CUSTOM_PLUGIN_STEP';
  }
}

function resolveStepStatus(
  workspace: RunWorkspaceViewModel,
  stepId: string
): NodeStatus | undefined {
  let latestStatus: { runSeq: number; status: NodeStatus } | null = null;

  for (const event of workspace.timeline.events) {
    if (event.stepId !== stepId) {
      continue;
    }

    const status = (() => {
      switch (event.eventType) {
        case 'StepStarted':
          return 'running';
        case 'StepCompleted':
          return 'success';
        case 'StepFailed':
          return 'failed';
        case 'StepSkipped':
          return 'skipped';
        default:
          return null;
      }
    })();

    if (status && (latestStatus == null || event.runSeq > latestStatus.runSeq)) {
      latestStatus = { runSeq: event.runSeq, status };
    }
  }

  if (latestStatus) {
    return latestStatus.status;
  }
  if (workspace.snapshot.failedStepId === stepId) {
    return 'failed';
  }
  if (workspace.snapshot.status === 'completed') {
    return 'success';
  }
  return undefined;
}

function restoreCurrentPlanSteps(
  workspace: RunWorkspaceViewModel,
  currentPlan: PlanViewModel | null
): ExecutionStep[] | null {
  const { snapshot } = workspace;
  if (
    currentPlan == null ||
    snapshot.planId !== currentPlan.planId ||
    (snapshot.planVersion != null && snapshot.planVersion !== currentPlan.planVersion)
  ) {
    return null;
  }

  return currentPlan.steps.map((step) => ({
    id: step.id,
    type: toExecutionStepType(step.type),
    name: step.name,
    nodes: [...step.nodes],
    policies: { ...step.policies },
    status: resolveStepStatus(workspace, step.id),
  }));
}

function toFocusedRunModel(
  workspace: RunWorkspaceViewModel,
  currentPlan: PlanViewModel | null
): Run | null {
  const { snapshot } = workspace;
  if (!snapshot.planId || !snapshot.environment) {
    return null;
  }

  const restoredSteps = restoreCurrentPlanSteps(workspace, currentPlan);

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
    steps: restoredSteps ?? [],
  };

  return restoredSteps == null
    ? ({ ...focusedRun, runtimeDetail: { level: 'snapshot' } } as Run)
    : focusedRun;
}

export function RunsWorkbenchSurface({ resolveRouteBootstrapId }: RunsWorkbenchSurfaceProps) {
  const { runId } = useParams();
  const navigate = useNavigate();
  const runsService = useRunsService();
  const runControls = useRunControlCommands({
    onRecoveryAccepted: (recoveryRunId) => {
      void navigate(`/runs/${recoveryRunId}`);
    },
  });
  const setCurrentRun = useExecutionStore((state) => state.setCurrentRun);
  const currentPlan = useExecutionStore((state) => state.currentPlan);
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
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
    canRetryEventFeed,
    retryEventFeed,
  } = useRunWorkspace(runId);

  const focusedRunModel = runId && workspace ? toFocusedRunModel(workspace, currentPlan) : null;

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
    deriveRunsRouteBootstrapPresentation(state, applicationLanguage)
  );

  switch (state.kind) {
    case 'runs-error':
      return <RunsErrorState message={state.message} />;
    case 'runs-empty':
      return <RunsEmptyState />;
    case 'runs-list':
      return (
        <RunListState runs={state.runs} isLoading={state.isLoading} runControls={runControls} />
      );
    case 'run-loading':
      return <RunDetailLoadingState runId={state.runId} />;
    case 'run-error':
      return <RunDetailErrorState runId={state.runId} message={state.message} />;
    case 'run-missing':
      return <RunMissingState runId={state.runId} />;
    case 'run-workspace':
      return (
        <RunWorkspaceState
          workspace={state.workspace}
          runControls={runControls}
          onRetryEventFeed={canRetryEventFeed ? retryEventFeed : undefined}
          loadMaterializationSample={runsService.getRunMaterializationSample}
        />
      );
  }
}

export default function RunsView() {
  return (
    <RunsWorkbenchSurface
      resolveRouteBootstrapId={(runId) => (runId ? RUN_DETAIL_ROUTE_ID : RUNS_ROUTE_ID)}
    />
  );
}
