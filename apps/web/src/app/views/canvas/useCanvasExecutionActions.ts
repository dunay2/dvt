import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { ShellFeedbackPort } from '../../ports/shellFeedback';
import type { IWorkspacePort } from '../../ports/workspace';
import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';
import { executeCanvasPlanAction } from './canvasPlanAction';
import {
  buildPlanStatusSummary,
  hasPersistedPreviewProof,
  hasPlanRefHashMismatch,
  resolvePlanRefForStartRun,
} from './canvasPlanReadiness';
import { executeCanvasRunStartAction } from './canvasRunStartAction';
import { validateTransformationGraph } from './transformationGraphValidation';

export { resolvePlanRefForStartRun } from './canvasPlanReadiness';

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
  currentPlan: ExecutionPlan | null;
  setCurrentPlan: (plan: ExecutionPlan | null) => void;
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
  const hasPersistedPlanForRun = hasPersistedPreviewProof(currentPlan);
  const planRefHashMismatch = hasPlanRefHashMismatch(currentPlan);
  const transformationValidation = validateTransformationGraph({
    nodes: canonicalNodes,
    edges: canonicalEdges,
    selectedNodeIds,
    workspaceNodeIds,
  });
  const isCurrentPlanStale =
    currentPlan != null &&
    lastPlannedDraftSignature != null &&
    lastPlannedDraftSignature !== transformationValidation.draftSignature;
  const canStartRun =
    canRun &&
    currentPlan != null &&
    hasPersistedPlanForRun &&
    transformationValidation.valid &&
    !isCurrentPlanStale;
  const planStatusSummary = buildPlanStatusSummary({
    canRun,
    currentPlan,
    isCurrentPlanStale,
    planRefHashMismatch,
    hasPersistedPlanForRun,
  });

  useEffect(() => {
    if (currentPlan == null) {
      setLastPlannedDraftSignature(null);
    }
  }, [currentPlan]);

  const handlePlan = useCallback(async () => {
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
    shellFeedback.success('Execution plan created');
  }, [
    canPlan,
    canonicalEdges,
    canonicalNodes,
    plansService,
    previewProvenanceConfig,
    selectedNodeIds,
    sessionContext,
    setCurrentPlan,
    shellFeedback,
    transformationValidation.draftSignature,
    transformationValidation.summary,
    transformationValidation.valid,
    workspaceService,
    workspaceNodeIds,
  ]);

  const handleStartRun = useCallback(async () => {
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
    if (!consolePanelVisible) {
      toggleConsolePanel();
    } else {
      setConsolePanelHeight(160);
    }

    shellFeedback.success('Run started');
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
    shellFeedback,
    toggleConsolePanel,
  ]);

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
