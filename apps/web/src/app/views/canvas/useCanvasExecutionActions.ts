/** Owned concern: coordinate Canvas plan and run action handlers. */
import { useMemo, useState } from 'react';
import { asNonBlankString } from '@dvt/contracts';

import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import { deriveCanvasExecutionState } from './canvasExecutionState';
import { presentPlanRunReadiness } from './canvasReadinessPresentation';
import type {
  CanvasPreviewAttempt,
  UseCanvasExecutionActionsParams,
  UseCanvasExecutionActionsResult,
} from './canvasExecutionActions.types';
import { useCanvasPlanActionHandler } from './useCanvasPlanActionHandler';
import { useCanvasRunStartHandler } from './useCanvasRunStartHandler';
import { doesPreviewOutcomeOwnPlan } from './canvasPreviewOutcomeProjection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { evaluateCanvasExecutionGraph } from './canvasExecutionGraph';

function normalizeExecutionEnvironmentId(
  environmentId: WorkspaceScope['environmentId'] | undefined
): WorkspaceScope['environmentId'] | null {
  const normalized = environmentId?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function createCanvasExecutionSessionContext(args: {
  sessionContext: SessionContextPort;
  executionEnvironmentId: WorkspaceScope['environmentId'] | undefined;
}): SessionContextPort {
  const environmentId = normalizeExecutionEnvironmentId(args.executionEnvironmentId);
  if (environmentId == null) {
    return args.sessionContext;
  }

  const withExecutionEnvironment = (scope: WorkspaceScope): WorkspaceScope => ({
    ...scope,
    environmentId,
  });

  return {
    getWorkspaceScope: () => withExecutionEnvironment(args.sessionContext.getWorkspaceScope()),
    getWorkspaceScopeSnapshot: () =>
      withExecutionEnvironment(args.sessionContext.getWorkspaceScopeSnapshot()),
    subscribeWorkspaceScope: args.sessionContext.subscribeWorkspaceScope,
    buildRunContext: (runId) => ({
      ...args.sessionContext.buildRunContext(runId),
      environmentId: asNonBlankString(environmentId),
    }),
  };
}

export function useCanvasExecutionActions({
  graphDraftCanvasId,
  plansService,
  runsService,
  workspaceFilesQuery,
  graphDbtWorkspaceArtifactPublicationCommand,
  graphDbtModelCompilationQuery,
  executionStrategy,
  canonicalNodes,
  canonicalEdges,
  selectionIntent,
  workspaceNodeIds,
  flushDraftForExecution,
  canPlan,
  runAdmission,
  sessionContext,
  executionEnvironmentId,
  shellFeedback,
  bottomDrawerVisible,
  currentPlan,
  setCurrentPlan,
  setBottomDrawerHeight,
  toggleBottomDrawer,
  onRunStarted,
}: UseCanvasExecutionActionsParams): UseCanvasExecutionActionsResult {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [previewAttempt, setPreviewAttempt] = useState<CanvasPreviewAttempt | null>(null);
  const latestPreviewOutcome =
    previewAttempt != null && doesPreviewOutcomeOwnPlan(previewAttempt.outcome, currentPlan)
      ? previewAttempt.outcome
      : null;
  const executionSessionContext = createCanvasExecutionSessionContext({
    sessionContext,
    executionEnvironmentId,
  });
  const scope = executionSessionContext.getWorkspaceScopeSnapshot();
  const graph = useMemo(
    () =>
      evaluateCanvasExecutionGraph({
        graphDraftCanvasId,
        registeredStrategy: executionStrategy,
        canonicalNodes,
        canonicalEdges,
        selectionIntent,
        workspaceNodeIds,
        executionScope: {
          tenantId: scope.tenantId,
          projectId: scope.projectId,
          environmentId: scope.environmentId,
        },
      }),
    [
      graphDraftCanvasId,
      executionStrategy,
      canonicalNodes,
      canonicalEdges,
      selectionIntent,
      workspaceNodeIds,
      scope.tenantId,
      scope.projectId,
      scope.environmentId,
    ]
  );
  const observeExecution = () =>
    deriveCanvasExecutionState({
      graph,
      runAdmission,
      currentPlan,
      lastPlannedDraftSignature: previewAttempt?.draftSignature ?? null,
      latestPreviewOutcome,
    });
  const executionState = observeExecution();
  const { isCurrentPlanStale } = executionState;
  const planRunReadiness = presentPlanRunReadiness(
    executionState.planRunReadiness,
    applicationLanguage
  );

  const planAction = useCanvasPlanActionHandler({
    graphDraftCanvasId,
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
    executionStrategy: graph.executionStrategy,
    selectionIntent,
    sessionContext: executionSessionContext,
    shellFeedback,
    flushDraftForExecution,
    workspaceNodeIds,
    workspaceFilesQuery,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    setCurrentPlan,
    setPlanModalOpen,
    setPreviewAttempt,
  });

  const handleStartRun = useCanvasRunStartHandler({
    observeReadiness: () => observeExecution().planRunReadiness,
    bottomDrawerVisible,
    onRunStarted,
    runsService,
    sessionContext: executionSessionContext,
    setBottomDrawerHeight,
    setPlanModalOpen,
    shellFeedback,
    toggleBottomDrawer,
  });

  return {
    planModalOpen,
    setPlanModalOpen,
    canPlanGraph: graph.canPlanGraph,
    canStartRun: executionState.planRunReadiness.status === 'ready',
    isCurrentPlanStale,
    planRunReadiness,
    transformationValidation: graph.transformationValidation,
    latestPreviewOutcome: executionState.isPreviewOutcomeStale ? null : latestPreviewOutcome,
    handlePreviewExecutionPlan: planAction.handlePreviewExecutionPlan,
    handleStartRun,
  };
}
