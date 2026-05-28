/** Owned concern: bind Canvas plan command handling to minimal execution ports. */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '../../queries/queryKeys';
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
  | 'flushDraftForExecution'
  | 'workspaceNodeIds'
  | 'workspaceFilesQuery'
  | 'workspaceFileContentCommand'
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
  flushDraftForExecution,
  transformationValidation,
  workspaceNodeIds,
  workspaceFilesQuery,
  workspaceFileContentCommand,
  setCurrentPlan,
  setLastPlannedDraftSignature,
  setPlanModalOpen,
}: UseCanvasPlanActionHandlerArgs): () => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!canPlan) {
      shellFeedback.error(canvasViewCopy.planPermissionDeniedMessage);
      return;
    }

    if (executionStrategy == null || executionStrategy.kind === 'not_executable') {
      shellFeedback.error(canvasViewCopy.canvasExecutionUnavailableMessage);
      return;
    }

    const flushedDraftGraph =
      flushDraftForExecution != null ? await flushDraftForExecution() : null;
    if (flushedDraftGraph?.ok === false) {
      shellFeedback.error(flushedDraftGraph.message);
      return;
    }

    const result = await executeCanvasPlanAction({
      canPlan,
      canonicalEdges: flushedDraftGraph?.canonicalEdges ?? canonicalEdges,
      canonicalNodes: flushedDraftGraph?.canonicalNodes ?? canonicalNodes,
      executionStrategy,
      plansService,
      previewProvenanceConfig,
      selectedNodeIds,
      sessionContext,
      transformationValidation,
      workspaceNodeIds: flushedDraftGraph?.workspaceNodeIds ?? workspaceNodeIds,
      workspaceFilesQuery,
      workspaceFileContentCommand,
    });

    if (!result.ok) {
      shellFeedback.error(result.message);
      return;
    }

    void queryClient.invalidateQueries({ queryKey: queryKeys.workspace.fileTree() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspace.artifacts() });
    if (previewProvenanceConfig.graphArtifactPath) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.fileContent(previewProvenanceConfig.graphArtifactPath),
      });
    }
    for (const artifactPath of result.writtenArtifactPaths) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.fileContent(artifactPath),
      });
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
    workspaceFilesQuery,
    workspaceFileContentCommand,
    queryClient,
    shellFeedback,
    flushDraftForExecution,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
  ]);
}
