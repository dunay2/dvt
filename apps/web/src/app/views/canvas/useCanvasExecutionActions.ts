/** Owned concern: coordinate Canvas plan and run action handlers. */
import { useState } from 'react';
import { asNonBlankString } from '@dvt/contracts';

import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import { deriveCanvasExecutionState } from './canvasExecutionState';
import type {
  CanvasPreviewAttempt,
  UseCanvasExecutionActionsParams,
  UseCanvasExecutionActionsResult,
} from './canvasExecutionActions.types';
import { useCanvasPlanActionHandler } from './useCanvasPlanActionHandler';
import { useCanvasRunStartHandler } from './useCanvasRunStartHandler';
import { doesPreviewOutcomeOwnPlan } from './canvasPreviewOutcomeProjection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasPreviewExecutionStrategy } from './canvasPreviewExecutionStrategy';

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
  const resolvedExecutionStrategy = resolveCanvasPreviewExecutionStrategy({
    graphDraftCanvasId,
    registeredStrategy: executionStrategy,
    canonicalNodes,
    canonicalEdges,
    selectionIntent,
    workspaceNodeIds,
    executionScope: executionSessionContext.getWorkspaceScopeSnapshot(),
  });
  const effectiveRunAdmission =
    runAdmission.allowed &&
    (resolvedExecutionStrategy == null || resolvedExecutionStrategy.kind === 'not_executable')
      ? ({ allowed: false, reason: 'capability_mismatch' } as const)
      : runAdmission;
  const executionState = deriveCanvasExecutionState({
    graphDraftCanvasId,
    runAdmission: effectiveRunAdmission,
    executionStrategy: resolvedExecutionStrategy,
    currentPlan,
    lastPlannedDraftSignature: previewAttempt?.draftSignature ?? null,
    canonicalNodes,
    canonicalEdges,
    selectionIntent,
    workspaceNodeIds,
    latestPreviewOutcome,
    executionScope: executionSessionContext.getWorkspaceScopeSnapshot(),
    applicationLanguage,
  });
  const {
    hasPersistedPlanForRun,
    isCurrentPlanStale,
    executableGraphFailureMessage,
    canPlanGraph,
    canStartRun,
    planRunReadiness,
    planStatusSummary,
  } = executionState;

  const planAction = useCanvasPlanActionHandler({
    graphDraftCanvasId,
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
    executionStrategy: resolvedExecutionStrategy,
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
    runAdmission: effectiveRunAdmission,
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
    latestPreviewOutcome: executionState.isPreviewOutcomeStale ? null : latestPreviewOutcome,
    handlePreviewExecutionPlan: planAction.handlePreviewExecutionPlan,
    handleStartRun,
  };
}
