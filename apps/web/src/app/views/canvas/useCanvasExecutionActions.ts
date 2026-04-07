import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import { buildSessionRunContext } from '../../services/plans/plansService';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { ExecutionPlan } from '../../types/dbt';
import type { PlanRef } from '../../types/engine';
import { validateTransformationGraph } from './transformationGraphValidation';

type UseCanvasExecutionActionsParams = {
  plansService: IPlansPort;
  runsService: IRunsPort;
  canonicalNodes: CanonicalNode[];
  canonicalEdges: CanonicalEdge[];
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
  canPlan: boolean;
  canRun: boolean;
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

export function resolvePlanRefForStartRun(plan: ExecutionPlan): PlanRef | null {
  return plan.planRef ?? null;
}

export function useCanvasExecutionActions({
  plansService,
  runsService,
  canonicalNodes,
  canonicalEdges,
  selectedNodeIds,
  workspaceNodeIds,
  canPlan,
  canRun,
  consolePanelVisible,
  currentPlan,
  setCurrentPlan,
  setConsolePanelHeight,
  toggleConsolePanel,
  onRunStarted,
}: UseCanvasExecutionActionsParams): UseCanvasExecutionActionsResult {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [lastPlannedDraftSignature, setLastPlannedDraftSignature] = useState<string | null>(null);
  const transformationValidation = validateTransformationGraph({
    nodes: canonicalNodes,
    edges: canonicalEdges,
    selectedNodeIds,
  });
  const isCurrentPlanStale =
    currentPlan != null &&
    lastPlannedDraftSignature != null &&
    lastPlannedDraftSignature !== transformationValidation.draftSignature;
  const canStartRun = currentPlan != null && transformationValidation.valid && !isCurrentPlanStale;
  const planStatusSummary =
    currentPlan == null
      ? 'Preview required before running.'
      : isCurrentPlanStale
        ? 'Preview is stale. Re-run Plan before starting.'
        : 'Preview is current and ready to run.';

  useEffect(() => {
    if (currentPlan == null) {
      setLastPlannedDraftSignature(null);
    }
  }, [currentPlan]);

  const handlePlan = useCallback(async () => {
    if (!canPlan) {
      toast.error('You do not have permission to create plans');
      return;
    }

    if (!transformationValidation.valid) {
      toast.error(transformationValidation.summary);
      return;
    }

    try {
      const selectedForPlan = selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodeIds;
      const plan = await plansService.previewPlan({
        selectedNodeIds: selectedForPlan,
        context: buildSessionRunContext(`run_ui_${Date.now()}`),
        persist: true,
      });
      setCurrentPlan(plan);
      setLastPlannedDraftSignature(transformationValidation.draftSignature);
      setPlanModalOpen(true);
      toast.success('Execution plan created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create execution plan';
      toast.error(message);
    }
  }, [
    canPlan,
    plansService,
    selectedNodeIds,
    setCurrentPlan,
    transformationValidation.valid,
    transformationValidation.summary,
    workspaceNodeIds,
  ]);

  const handleStartRun = useCallback(async () => {
    if (!canRun) {
      toast.error('You do not have permission to start runs');
      return;
    }

    if (!currentPlan) {
      toast.error('No execution plan available — run Plan first');
      return;
    }

    if (isCurrentPlanStale) {
      toast.error('Preview is stale. Re-run Plan before starting.');
      setPlanModalOpen(true);
      return;
    }

    setPlanModalOpen(false);

    try {
      const runId = `run_ui_${Date.now()}`;
      const context = buildSessionRunContext(runId);
      const planRef = resolvePlanRefForStartRun(currentPlan);
      if (!planRef) {
        toast.error('Plan reference is unavailable for this mode');
        setPlanModalOpen(true);
        return;
      }
      const runRef = await runsService.startRun({ planRef, context });

      if (!consolePanelVisible) {
        toggleConsolePanel();
      } else {
        setConsolePanelHeight(160);
      }

      toast.success('Run started');
      onRunStarted(runRef.runId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start run';
      toast.error(message);
      setPlanModalOpen(true);
    }
  }, [
    canRun,
    consolePanelVisible,
    currentPlan,
    isCurrentPlanStale,
    onRunStarted,
    runsService,
    setConsolePanelHeight,
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
