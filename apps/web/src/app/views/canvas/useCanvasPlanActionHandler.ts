import { useCallback } from 'react';

import { canvasViewCopy } from './copy';
import type {
  SetLastPlannedDraftSignature,
  SetPlanModalOpen,
  UseCanvasExecutionActionsParams,
} from './canvasExecutionActions.types';
import { executeCanvasPlanAction } from './canvasPlanAction';
import type { CanvasExecutionState } from './canvasExecutionState';

type UseCanvasPlanActionHandlerArgs = Pick<
  UseCanvasExecutionActionsParams,
  | 'canPlan'
  | 'canonicalEdges'
  | 'canonicalNodes'
  | 'executionStrategy'
  | 'plansService'
  | 'previewProvenanceConfig'
  | 'selectedNodeIds'
  | 'sessionContext'
  | 'shellFeedback'
  | 'workspaceNodeIds'
  | 'workspaceService'
  | 'setCurrentPlan'
> & {
  transformationValidation: CanvasExecutionState['transformationValidation'];
  setLastPlannedDraftSignature: SetLastPlannedDraftSignature;
  setPlanModalOpen: SetPlanModalOpen;
};

export function useCanvasPlanActionHandler({
  canPlan,
  canonicalEdges,
  canonicalNodes,
  executionStrategy,
  plansService,
  previewProvenanceConfig,
  selectedNodeIds,
  sessionContext,
  shellFeedback,
  transformationValidation,
  workspaceNodeIds,
  workspaceService,
  setCurrentPlan,
  setLastPlannedDraftSignature,
  setPlanModalOpen,
}: UseCanvasPlanActionHandlerArgs): () => Promise<void> {
  return useCallback(async () => {
    const result = await executeCanvasPlanAction({
      canPlan,
      canonicalEdges,
      canonicalNodes,
      executionStrategy,
      plansService,
      previewProvenanceConfig,
      selectedNodeIds,
      sessionContext,
      transformationValidation,
      workspaceNodeIds,
      workspaceService,
    });

    if (!result.ok) {
      shellFeedback.error(result.message);
      return;
    }

    setCurrentPlan(result.plan);
    setLastPlannedDraftSignature(result.draftSignature);
    setPlanModalOpen(true);
    shellFeedback.success(canvasViewCopy.planCreatedMessage);
  }, [
    canPlan,
    canonicalEdges,
    canonicalNodes,
    executionStrategy,
    plansService,
    previewProvenanceConfig,
    selectedNodeIds,
    sessionContext,
    transformationValidation,
    workspaceNodeIds,
    workspaceService,
    shellFeedback,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
  ]);
}
