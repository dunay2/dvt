import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

import type { IPlansPort } from '../../ports/plans';
import type { IRunsPort } from '../../ports/runs';
import { buildSessionRunContext, buildPlanRefFromPlan } from '../../services/plans/plansService';
import type { ExecutionPlan } from '../../types/dbt';

type UseCanvasExecutionActionsParams = {
  plansService: IPlansPort;
  runsService: IRunsPort;
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
  handlePlan: () => Promise<void>;
  handleStartRun: () => Promise<void>;
};

export function useCanvasExecutionActions({
  plansService,
  runsService,
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

  const handlePlan = useCallback(async () => {
    if (!canPlan) {
      toast.error('You do not have permission to create plans');
      return;
    }

    try {
      const selectedForPlan = selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodeIds;
      const plan = await plansService.previewPlan({
        selectedNodeIds: selectedForPlan,
        context: buildSessionRunContext(`run_ui_${Date.now()}`),
      });
      setCurrentPlan(plan);
      setPlanModalOpen(true);
      toast.success('Execution plan created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create execution plan';
      toast.error(message);
    }
  }, [canPlan, plansService, selectedNodeIds, setCurrentPlan, workspaceNodeIds]);

  const handleStartRun = useCallback(async () => {
    if (!canRun) {
      toast.error('You do not have permission to start runs');
      return;
    }

    if (!currentPlan) {
      toast.error('No execution plan available — run Plan first');
      return;
    }

    setPlanModalOpen(false);

    try {
      const runId = `run_ui_${Date.now()}`;
      const context = buildSessionRunContext(runId);
      const planRef = buildPlanRefFromPlan(currentPlan);
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
    onRunStarted,
    runsService,
    setConsolePanelHeight,
    toggleConsolePanel,
  ]);

  return {
    planModalOpen,
    setPlanModalOpen,
    handlePlan,
    handleStartRun,
  };
}
