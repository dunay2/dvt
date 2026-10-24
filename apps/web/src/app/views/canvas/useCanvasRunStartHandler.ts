import { useCallback } from 'react';

import { canvasViewCopy } from './copy';
import type {
  SetPlanModalOpen,
  UseCanvasExecutionActionsParams,
} from './canvasExecutionActions.types';
import { executeCanvasRunStartAction } from './canvasRunStartAction';
import { presentCanvasRunStartFailure } from './canvasReadinessPresentation';
import type { PlanRunReadinessEvaluation } from './canvasPlanReadiness';

type UseCanvasRunStartHandlerArgs = Pick<
  UseCanvasExecutionActionsParams,
  | 'bottomDrawerVisible'
  | 'onRunStarted'
  | 'runsService'
  | 'sessionContext'
  | 'setBottomDrawerHeight'
  | 'shellFeedback'
  | 'toggleBottomDrawer'
> & {
  observeReadiness: () => PlanRunReadinessEvaluation;
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
  bottomDrawerVisible,
  observeReadiness,
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
      observeReadiness,
      runsService,
      sessionContext,
    });

    if (!result.ok) {
      const rejection = presentCanvasRunStartFailure(result.failure);
      shellFeedback.error(rejection.message);
      setPlanModalOpen(rejection.shouldOpenPlanModal);
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
    bottomDrawerVisible,
    observeReadiness,
    onRunStarted,
    runsService,
    sessionContext,
    setBottomDrawerHeight,
    setPlanModalOpen,
    shellFeedback,
    toggleBottomDrawer,
  ]);
}
