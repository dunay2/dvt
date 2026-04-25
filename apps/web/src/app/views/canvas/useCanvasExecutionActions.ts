import { useEffect, useState } from 'react';

import { deriveCanvasExecutionState } from './canvasExecutionState';
import type {
  UseCanvasExecutionActionsParams,
  UseCanvasExecutionActionsResult,
} from './canvasExecutionActions.types';
import { useCanvasPlanActionHandler } from './useCanvasPlanActionHandler';
import { useCanvasRunStartHandler } from './useCanvasRunStartHandler';

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
  workspaceService,
  executionStrategy,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  workspaceNodeIds,
  canPlan,
  canRun,
  sessionContext,
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
    canStartRun,
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
    sessionContext,
    shellFeedback,
    transformationValidation,
    workspaceNodeIds,
    workspaceService,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
  });

  const handleStartRun = useCanvasRunStartHandler({
    canRun: canRun && executionStrategy.kind === 'transformation_preview',
    consolePanelVisible,
    currentPlan,
    hasPersistedPlanForRun,
    isCurrentPlanStale,
    onRunStarted,
    runsService,
    sessionContext,
    setConsolePanelHeight,
    setPlanModalOpen,
    shellFeedback,
    toggleConsolePanel,
  });

  return {
    planModalOpen,
    setPlanModalOpen,
    canStartRun,
    isCurrentPlanStale,
    planStatusSummary,
    handlePlan,
    handleStartRun,
  };
}
