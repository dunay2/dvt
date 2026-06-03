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
  plansService,
  runsService,
  workspaceFilesQuery,
  workspaceFileContentCommand,
  executionStrategy,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  workspaceNodeIds,
  flushDraftForExecution,
  canPlan,
  canRun,
  sessionContext,
  executionEnvironmentId,
  shellFeedback,
  previewProvenanceConfig,
  consolePanelVisible,
  currentPlan,
  setCurrentPlan,
  setConsolePanelHeight,
  toggleConsolePanel,
  onRunStarted,
}: UseCanvasExecutionActionsParams): UseCanvasExecutionActionsResult {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [lastPlannedDraftSignature, setLastPlannedDraftSignature] = useState<string | null>(null);
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
    selectedNodeIds,
    workspaceNodeIds,
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

  const handlePlan = useCanvasPlanActionHandler({
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
    executionStrategy,
    previewProvenanceConfig,
    selectedNodeIds,
    sessionContext: executionSessionContext,
    shellFeedback,
    flushDraftForExecution,
    transformationValidation,
    workspaceNodeIds,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
  });

  const handleStartRun = useCanvasRunStartHandler({
    canRun: canRun && executionStrategy != null && executionStrategy.kind !== 'not_executable',
    consolePanelVisible,
    currentPlan,
    executableGraphFailureMessage,
    hasPersistedPlanForRun,
    isCurrentPlanStale,
    onRunStarted,
    runsService,
    sessionContext: executionSessionContext,
    setConsolePanelHeight,
    setPlanModalOpen,
    shellFeedback,
    toggleConsolePanel,
  });

  return {
    planModalOpen,
    setPlanModalOpen,
    canPlanGraph,
    canStartRun,
    isCurrentPlanStale,
    planRunReadiness,
    planStatusSummary,
    handlePlan,
    handleStartRun,
  };
}
