import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { PlanViewModel } from '../../types/plans';

import { resolvePlanRefForStartRun } from './canvasPlanReadiness';

type CanvasRunStartActionFailure = {
  ok: false;
  message: string;
  shouldOpenPlanModal: boolean;
};

type CanvasRunStartActionSuccess = {
  ok: true;
  runId: string;
};

export type CanvasRunStartActionResult =
  | CanvasRunStartActionFailure
  | CanvasRunStartActionSuccess;

export async function executeCanvasRunStartAction({
  canRun,
  currentPlan,
  hasPersistedPlanForRun,
  isCurrentPlanStale,
  runsService,
  sessionContext,
}: {
  canRun: boolean;
  currentPlan: PlanViewModel | null;
  hasPersistedPlanForRun: boolean;
  isCurrentPlanStale: boolean;
  runsService: IRunsPort;
  sessionContext: SessionContextPort;
}): Promise<CanvasRunStartActionResult> {
  if (!canRun) {
    return {
      ok: false,
      message: 'You do not have permission to start runs',
      shouldOpenPlanModal: false,
    };
  }

  if (!currentPlan) {
    return {
      ok: false,
      message: 'No execution plan available - run Plan first',
      shouldOpenPlanModal: false,
    };
  }

  if (isCurrentPlanStale) {
    return {
      ok: false,
      message: 'Preview is stale. Re-run Plan before starting.',
      shouldOpenPlanModal: true,
    };
  }

  const planRef = resolvePlanRefForStartRun(currentPlan);
  if (!planRef) {
    return {
      ok: false,
      message: 'Plan reference is unavailable for this mode',
      shouldOpenPlanModal: true,
    };
  }

  if (!hasPersistedPlanForRun) {
    return {
      ok: false,
      message:
        'Run start requires a persisted preview plan bound to the current plan reference. Re-run Plan first.',
      shouldOpenPlanModal: true,
    };
  }

  try {
    const runId = `run_ui_${Date.now()}`;
    const context = sessionContext.buildRunContext(runId);
    const runRef = await runsService.startRun({ planRef, context });
    return { ok: true, runId: runRef.runId };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to start run',
      shouldOpenPlanModal: true,
    };
  }
}
