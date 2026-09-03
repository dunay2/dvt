/** Owned concern: coordinate Canvas plan and run action handlers. */
import { useEffect, useState } from 'react';
import { asNonBlankString } from '@dvt/contracts';

import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import { deriveCanvasExecutionState } from './canvasExecutionState';
import type {
  UseCanvasExecutionActionsParams,
  UseCanvasExecutionActionsResult,
} from './canvasExecutionActions.types';
import { useCanvasPlanActionHandler } from './useCanvasPlanActionHandler';
import { useCanvasRunStartHandler } from './useCanvasRunStartHandler';
import type { PlanPreviewOutcome } from '../../ports/plans';
import { doesPreviewOutcomeOwnPlan } from './canvasPreviewOutcomeProjection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

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

function useCanvasExecutionDraftSignatureSync(args: {
  currentPlan: UseCanvasExecutionActionsParams['currentPlan'];
  setLastPlannedDraftSignature: (signature: string | null) => void;
}): void {
  useEffect(() => {
    if (args.currentPlan == null) {
      args.setLastPlannedDraftSignature(null);
    }
  }, [args.currentPlan, args.setLastPlannedDraftSignature]);
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
  canRun,
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
  const [lastPlannedDraftSignature, setLastPlannedDraftSignature] = useState<string | null>(null);
  const [latestPreviewOutcome, setLatestPreviewOutcome] = useState<PlanPreviewOutcome | null>(null);
  const executionSessionContext = createCanvasExecutionSessionContext({
    sessionContext,
    executionEnvironmentId,
  });
  const executionState = deriveCanvasExecutionState({
    canRun,
    executionStrategy,
    currentPlan,
    lastPlannedDraftSignature,
    canonicalNodes,
    canonicalEdges,
    selectionIntent,
    workspaceNodeIds,
    latestPreviewOutcome,
    executionScope: executionSessionContext.getWorkspaceScopeSnapshot(),
    applicationLanguage,
  });
  const {
    transformationValidation,
    hasPersistedPlanForRun,
    isCurrentPlanStale,
    executableGraphFailureMessage,
    canPlanGraph,
    canStartRun,
    planRunReadiness,
    planStatusSummary,
  } = executionState;

  useCanvasExecutionDraftSignatureSync({
    currentPlan,
    setLastPlannedDraftSignature,
  });

  useEffect(() => {
    setLatestPreviewOutcome((outcome) =>
      outcome == null || doesPreviewOutcomeOwnPlan(outcome, currentPlan) ? outcome : null
    );
  }, [currentPlan]);

  const planAction = useCanvasPlanActionHandler({
    graphDraftCanvasId,
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
    executionStrategy,
    selectionIntent,
    sessionContext: executionSessionContext,
    shellFeedback,
    flushDraftForExecution,
    workspaceNodeIds,
    workspaceFilesQuery,
    graphDbtWorkspaceArtifactPublicationCommand,
    graphDbtModelCompilationQuery,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
    setLatestPreviewOutcome,
  });

  const handleStartRun = useCanvasRunStartHandler({
    canRun: canRun && executionStrategy != null && executionStrategy.kind !== 'not_executable',
    bottomDrawerVisible,
    currentPlan,
    executableGraphFailureMessage,
    hasPersistedPlanForRun,
    isCurrentPlanStale,
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
    canPlanGraph,
    canStartRun,
    isCurrentPlanStale,
    planRunReadiness,
    planStatusSummary,
    latestPreviewOutcome,
    handlePreviewExecutionPlan: planAction.handlePreviewExecutionPlan,
    handleStartRun,
  };
}
