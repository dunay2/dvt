/** Start an admitted Run and delegate its operational reveal to the existing layout owner. */
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
  'onRunStarted' | 'runsService' | 'sessionContext' | 'showBottomDrawer' | 'shellFeedback'
> & {
  observeReadiness: () => PlanRunReadinessEvaluation;
  setPlanModalOpen: SetPlanModalOpen;
};

export function useCanvasRunStartHandler({
  observeReadiness,
  onRunStarted,
  runsService,
  sessionContext,
  showBottomDrawer,
  setPlanModalOpen,
  shellFeedback,
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
    showBottomDrawer();

    shellFeedback.success(canvasViewCopy.runStartedMessage);
    onRunStarted(result.runId);
  }, [
    observeReadiness,
    onRunStarted,
    runsService,
    sessionContext,
    showBottomDrawer,
    setPlanModalOpen,
    shellFeedback,
  ]);
}
