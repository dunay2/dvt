import { useCallback } from 'react';

import { canvasViewCopy } from './copy';
import type {
  SetPlanModalOpen,
  UseCanvasExecutionActionsParams,
} from './canvasExecutionActions.types';
import { executeCanvasRunStartAction } from './canvasRunStartAction';

type UseCanvasRunStartHandlerArgs = Pick<
  UseCanvasExecutionActionsParams,
  | 'canRun'
  | 'consolePanelVisible'
  | 'currentPlan'
  | 'onRunStarted'
  | 'runsService'
  | 'sessionContext'
  | 'setConsolePanelHeight'
  | 'shellFeedback'
  | 'toggleConsolePanel'
> & {
  hasPersistedPlanForRun: boolean;
  isCurrentPlanStale: boolean;
  setPlanModalOpen: SetPlanModalOpen;
};

function revealStartedRunConsole({
  consolePanelVisible,
  setConsolePanelHeight,
  toggleConsolePanel,
}: Pick<
  UseCanvasExecutionActionsParams,
  'consolePanelVisible' | 'setConsolePanelHeight' | 'toggleConsolePanel'
>): void {
  if (consolePanelVisible) {
    setConsolePanelHeight(160);
    return;
  }

  toggleConsolePanel();
}

export function useCanvasRunStartHandler({
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
