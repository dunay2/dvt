import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { canvasViewCopy } from './copy';
import {
  deriveCanvasExecutionState,
  type CanvasExecutionState,
} from './canvasExecutionState';
import { executeCanvasPlanAction } from './canvasPlanAction';
import { executeCanvasRunStartAction } from './canvasRunStartAction';

type UseCanvasExecutionActionsParams = {
  plansService: IPlansPort;
  runsService: IRunsPort;
  workspaceService: IWorkspacePort;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
  canPlan: boolean;
  canRun: boolean;
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  previewProvenanceConfig: Pick<
    WorkspaceBootstrapConfig,
    'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
  >;
  consolePanelVisible: boolean;
  currentPlan: PlanViewModel | null;
  setCurrentPlan: (plan: PlanViewModel | null) => void;
  setConsolePanelHeight: (height: number) => void;
  toggleConsolePanel: () => void;
  onRunStarted: (runId: string) => void;
};

type UseCanvasExecutionActionsResult = {
  planModalOpen: boolean;
  setPlanModalOpen: Dispatch<SetStateAction<boolean>>;
  canStartRun: boolean;
  isCurrentPlanStale: boolean;
  planStatusSummary: string;
  handlePlan: () => Promise<void>;
  handleStartRun: () => Promise<void>;
};

type RevealStartedRunConsoleArgs = {
  consolePanelVisible: boolean;
  setConsolePanelHeight: (height: number) => void;
  toggleConsolePanel: () => void;
};

type UseCanvasExecutionDraftSignatureSyncArgs = {
  currentPlan: PlanViewModel | null;
  setLastPlannedDraftSignature: Dispatch<SetStateAction<string | null>>;
};

type UseCanvasPlanHandlerArgs = {
  canPlan: boolean;
  canonicalEdges: CanonicalEdge[];
  canonicalNodes: CanonicalNode[];
  plansService: IPlansPort;
  previewProvenanceConfig: Pick<
    WorkspaceBootstrapConfig,
    'gitBranch' | 'gitSha' | 'gitRepo' | 'graphArtifactPath'
  >;
  selectedNodeIds: string[];
  sessionContext: SessionContextPort;
  shellFeedback: ShellFeedbackPort;
  transformationValidation: CanvasExecutionState['transformationValidation'];
  workspaceNodeIds: string[];
  workspaceService: IWorkspacePort;
  setCurrentPlan: (plan: PlanViewModel | null) => void;
  setLastPlannedDraftSignature: Dispatch<SetStateAction<string | null>>;
  setPlanModalOpen: Dispatch<SetStateAction<boolean>>;
};

type UseCanvasRunStartHandlerArgs = {
  canRun: boolean;
  consolePanelVisible: boolean;
  currentPlan: PlanViewModel | null;
  hasPersistedPlanForRun: boolean;
  isCurrentPlanStale: boolean;
  onRunStarted: (runId: string) => void;
  runsService: IRunsPort;
  sessionContext: SessionContextPort;
  setConsolePanelHeight: (height: number) => void;
  setPlanModalOpen: Dispatch<SetStateAction<boolean>>;
  shellFeedback: ShellFeedbackPort;
  toggleConsolePanel: () => void;
};

function revealStartedRunConsole({
  consolePanelVisible,
  setConsolePanelHeight,
  toggleConsolePanel,
}: RevealStartedRunConsoleArgs): void {
  if (consolePanelVisible) {
    setConsolePanelHeight(160);
    return;
  }

  toggleConsolePanel();
}

function useCanvasExecutionDraftSignatureSync({
  currentPlan,
  setLastPlannedDraftSignature,
}: UseCanvasExecutionDraftSignatureSyncArgs): void {
  useEffect(() => {
    if (currentPlan == null) {
      setLastPlannedDraftSignature(null);
    }
  }, [currentPlan, setLastPlannedDraftSignature]);
}

function useCanvasPlanHandler({
  canPlan,
  canonicalEdges,
  canonicalNodes,
  plansService,
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
}: UseCanvasPlanHandlerArgs): () => Promise<void> {
  return useCallback(async () => {
    const result = await executeCanvasPlanAction({
      canPlan,
      canonicalEdges,
      canonicalNodes,
      plansService,
      previewProvenanceConfig,
      selectedNodeIds,
      sessionContext,
      transformationValidation,
      workspaceNodeIds,
      workspaceService,
    });

    if (!result.ok) {
      shellFeedback.error(result.message);
      return;
    }

    setCurrentPlan(result.plan);
    setLastPlannedDraftSignature(result.draftSignature);
    setPlanModalOpen(true);
    shellFeedback.success(canvasViewCopy.planCreatedMessage);
  }, [
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
    previewProvenanceConfig,
    selectedNodeIds,
    sessionContext,
    transformationValidation,
    workspaceNodeIds,
    workspaceService,
    shellFeedback,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
  ]);
}

function useCanvasRunStartHandler({
  canRun,
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
}: UseCanvasRunStartHandlerArgs): () => Promise<void> {
  return useCallback(async () => {
    const result = await executeCanvasRunStartAction({
      canRun,
      currentPlan,
      hasPersistedPlanForRun,
      isCurrentPlanStale,
      runsService,
      sessionContext,
    });

    if (!result.ok) {
      shellFeedback.error(result.message);
      if (result.shouldOpenPlanModal) {
        setPlanModalOpen(true);
      }
      return;
    }

    setPlanModalOpen(false);
    revealStartedRunConsole({
      consolePanelVisible,
      setConsolePanelHeight,
      toggleConsolePanel,
    });

    shellFeedback.success(canvasViewCopy.runStartedMessage);
    onRunStarted(result.runId);
  }, [
    canRun,
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
  ]);
}

export function useCanvasExecutionActions({
  plansService,
  runsService,
  workspaceService,
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

  const handlePlan = useCanvasPlanHandler({
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
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
    canRun,
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
