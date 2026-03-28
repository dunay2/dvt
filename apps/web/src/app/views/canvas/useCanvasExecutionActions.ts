import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

import { buildSessionRunContext } from '../../services/plans/plansService';
import type { PlansService } from '../../services/plans/plansService';
import type { ExecutionPlan } from '../../types/dbt';

type UseCanvasExecutionActionsParams = {
  plansService: PlansService;
  selectedNodeIds: string[];
  workspaceNodeIds: string[];
  canPlan: boolean;
  canRun: boolean;
  consolePanelVisible: boolean;
  setCurrentPlan: (plan: ExecutionPlan | null) => void;
  setConsolePanelHeight: (height: number) => void;
  toggleConsolePanel: () => void;
};

type UseCanvasExecutionActionsResult = {
  planModalOpen: boolean;
  setPlanModalOpen: Dispatch<SetStateAction<boolean>>;
  handlePlan: () => Promise<void>;
  handleStartRun: () => void;
};

export function useCanvasExecutionActions({
  plansService,
  selectedNodeIds,
  workspaceNodeIds,
  canPlan,
  canRun,
  consolePanelVisible,
  setCurrentPlan,
  setConsolePanelHeight,
  toggleConsolePanel,
}: UseCanvasExecutionActionsParams): UseCanvasExecutionActionsResult {
  const [planModalOpen, setPlanModalOpen] = useState(false);

  const handlePlan = useCallback(async () => {
    if (!canPlan) {
      toast.error('You do not have permission to create plans');
      return;
    }

    try {
      const selectedForPlan =
        selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodeIds;
      const plan = await plansService.previewPlan({
        selectedNodeIds: selectedForPlan,
        context: buildSessionRunContext(`run_ui_${Date.now()}`),
      });
      setCurrentPlan(plan);
      setPlanModalOpen(true);
      toast.success('Execution plan created');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create execution plan';
      toast.error(message);
    }
  }, [canPlan, plansService, selectedNodeIds, setCurrentPlan, workspaceNodeIds]);

  const handleStartRun = useCallback(() => {
    if (!canRun) {
      toast.error('You do not have permission to start runs');
      return;
    }

    toast.success('Run started');
    setPlanModalOpen(false);
    if (!consolePanelVisible) {
      toggleConsolePanel();
    } else {
      setConsolePanelHeight(160);
    }
  }, [canRun, consolePanelVisible, setConsolePanelHeight, toggleConsolePanel]);

  return {
    planModalOpen,
    setPlanModalOpen,
    handlePlan,
    handleStartRun,
  };
}
