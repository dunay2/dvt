/**
 * Owned concern: derive toolbar workflow posture from canonical route state.
 */
import {
  canvasViewCopy,
  formatTransformationGraphValidationSummary,
} from './copy';
import type { CanvasGraphAuthoringMode } from '../../plugins/graphStrategyContracts';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

export type CanvasToolbarViewModel = {
  workflowStatusLabel: string;
  workflowStatusClass: string;
  workflowStatusTitle: string;
  canPlanTransformation: boolean;
};

type DeriveCanvasToolbarViewModelArgs = {
  draftToolbarState: CanvasDraftToolbarState;
  routeState: CanvasRouteState;
  canPlan: boolean;
  canRun: boolean;
  canStartRun: boolean;
  canvasAuthoringMode: CanvasGraphAuthoringMode;
  planStatusSummary: string;
  transformationValidation: TransformationGraphValidationResult;
  nodeCount: number;
  edgeCount: number;
};

function resolveWorkflowStatusLabel(
  isRecoveryActive: boolean,
  canPlan: boolean,
  canRun: boolean,
  canStartRun: boolean
): string {
  if (isRecoveryActive) {
    return canvasViewCopy.toolbarWorkflowRecoveryLabel;
  }

  if (!canPlan && !canRun) {
    return canvasViewCopy.toolbarWorkflowReadOnlyLabel;
  }

  if (canStartRun) {
    return canvasViewCopy.toolbarWorkflowRunReadyLabel;
  }

  return canvasViewCopy.toolbarWorkflowPlanRequiredLabel;
}

function resolveWorkflowStatusClass(
  isRecoveryActive: boolean,
  draftTone: CanvasDraftToolbarState['tone'],
  canPlan: boolean,
  canRun: boolean,
  canStartRun: boolean
): string {
  if (isRecoveryActive) {
    return draftTone === 'danger' ? 'text-rose-200' : 'text-amber-200';
  }

  if (!canPlan && !canRun) {
    return 'text-slate-200';
  }

  if (canStartRun) {
    return 'text-emerald-200';
  }

  return 'text-amber-200';
}

export function deriveCanvasToolbarViewModel({
  draftToolbarState,
  routeState,
  canPlan,
  canRun,
  canStartRun,
  canvasAuthoringMode,
  planStatusSummary,
  transformationValidation,
  nodeCount,
  edgeCount,
}: DeriveCanvasToolbarViewModelArgs): CanvasToolbarViewModel {
  const isRecoveryActive = routeState === 'recovery';
  const transformationValidationSummary = formatTransformationGraphValidationSummary(
    transformationValidation.summaryCode
  );

  return {
    workflowStatusLabel: resolveWorkflowStatusLabel(
      isRecoveryActive,
      canPlan,
      canRun,
      canStartRun
    ),
    workflowStatusClass: resolveWorkflowStatusClass(
      isRecoveryActive,
      draftToolbarState.tone,
      canPlan,
      canRun,
      canStartRun
    ),
    workflowStatusTitle: `${canvasAuthoringMode}:${planStatusSummary}:${transformationValidationSummary}:${nodeCount}:${edgeCount}`,
    canPlanTransformation: transformationValidation.valid,
  };
}
