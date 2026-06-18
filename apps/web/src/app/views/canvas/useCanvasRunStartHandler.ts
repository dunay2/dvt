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
  | 'bottomDrawerVisible'
  | 'currentPlan'
  | 'onRunStarted'
  | 'runsService'
  | 'sessionContext'
  | 'setBottomDrawerHeight'
  | 'shellFeedback'
  | 'toggleBottomDrawer'
> & {
  executableGraphFailureMessage: string | null;
  hasPersistedPlanForRun: boolean;
  isCurrentPlanStale: boolean;
  setPlanModalOpen: SetPlanModalOpen;
};

function revealStartedRunOperations({
  bottomDrawerVisible,
  setBottomDrawerHeight,
  toggleBottomDrawer,
}: Pick<
  UseCanvasExecutionActionsParams,
  'bottomDrawerVisible' | 'setBottomDrawerHeight' | 'toggleBottomDrawer'
>): void {
  if (bottomDrawerVisible) {
    setBottomDrawerHeight(160);
    return;
  }

  toggleBottomDrawer();
}

export function useCanvasRunStartHandler({
  canRun,
  bottomDrawerVisible,
  currentPlan,
  executableGraphFailureMessage,
  hasPersistedPlanForRun,
  isCurrentPlanStale,
  onRunStarted,
  runsService,
  sessionContext,
  setBottomDrawerHeight,
  setPlanModalOpen,
  shellFeedback,
  toggleBottomDrawer,
}: UseCanvasRunStartHandlerArgs): () => Promise<void> {
  return useCallback(async () => {
    const result = await executeCanvasRunStartAction({
      canRun,
      currentPlan,
      executableGraphFailureMessage,
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
    revealStartedRunOperations({
      bottomDrawerVisible,
      setBottomDrawerHeight,
      toggleBottomDrawer,
    });

    shellFeedback.success(canvasViewCopy.runStartedMessage);
    onRunStarted(result.runId);
  }, [
    canRun,
    bottomDrawerVisible,
    currentPlan,
    executableGraphFailureMessage,
    hasPersistedPlanForRun,
    isCurrentPlanStale,
    onRunStarted,
    runsService,
    sessionContext,
    setBottomDrawerHeight,
    setPlanModalOpen,
    shellFeedback,
    toggleBottomDrawer,
  ]);
}
