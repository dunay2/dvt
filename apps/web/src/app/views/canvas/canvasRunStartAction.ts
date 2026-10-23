/**
 * Owned concern: orchestrate Canvas run-start readiness and delegate execution
 * to the runs port without authoring runtime identity.
 */
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { PlanViewModel } from '../../types/plans';

import { resolvePlanRefForStartRun, resolvePlanRunBlockerMessage } from './canvasPlanReadiness';
import type { CanvasRunAdmission } from './canvasRuntimePolicy';
import { collectPlanSelection } from './canvasRunSelection';
import { canvasViewCopy } from './copy';

type CanvasRunStartActionFailure = {
  ok: false;
  message: string;
  shouldOpenPlanModal: boolean;
};

type CanvasRunStartActionSuccess = {
  ok: true;
  runId: string;
};

export type CanvasRunStartActionResult = CanvasRunStartActionFailure | CanvasRunStartActionSuccess;

export async function executeCanvasRunStartAction({
  runAdmission,
  currentPlan,
  executableGraphFailureMessage,
  hasPersistedPlanForRun,
  isCurrentPlanStale,
  runsService,
  sessionContext,
}: {
  runAdmission: CanvasRunAdmission;
  currentPlan: PlanViewModel | null;
  executableGraphFailureMessage: string | null;
  hasPersistedPlanForRun: boolean;
  isCurrentPlanStale: boolean;
  runsService: IRunsPort;
  sessionContext: SessionContextPort;
}): Promise<CanvasRunStartActionResult> {
  if (!runAdmission.allowed) {
    return {
      ok: false,
      message: resolvePlanRunBlockerMessage(runAdmission.reason, canvasViewCopy),
      shouldOpenPlanModal: false,
    };
  }

  if (!currentPlan) {
    return {
      ok: false,
      message: canvasViewCopy.runNoPlanMessage,
      shouldOpenPlanModal: false,
    };
  }

  if (executableGraphFailureMessage != null) {
    return {
      ok: false,
      message: executableGraphFailureMessage,
      shouldOpenPlanModal: false,
    };
  }

  if (isCurrentPlanStale) {
    return {
      ok: false,
      message: canvasViewCopy.runPreviewStaleMessage,
      shouldOpenPlanModal: true,
    };
  }

  const planRef = resolvePlanRefForStartRun(currentPlan);
  if (!planRef) {
    return {
      ok: false,
      message: canvasViewCopy.runPlanRefUnavailableMessage,
      shouldOpenPlanModal: true,
    };
  }

  if (!hasPersistedPlanForRun) {
    return {
      ok: false,
      message: canvasViewCopy.runPersistedPreviewRequiredMessage,
      shouldOpenPlanModal: true,
    };
  }

  try {
    const runReceipt = await runsService.startRun({
      planRef,
      workspaceScope: sessionContext.getWorkspaceScopeSnapshot(),
      selection: collectPlanSelection(currentPlan),
    });
    return { ok: true, runId: runReceipt.runId };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : canvasViewCopy.runFailedMessage,
      shouldOpenPlanModal: false,
    };
  }
}
