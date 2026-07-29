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
import { validateTransformationGraph } from './transformationGraphValidation';

type UseCanvasPlanActionHandlerArgs = Pick<
  UseCanvasExecutionActionsParams,
  | 'canPlan'
  | 'canonicalEdges'
  | 'canonicalNodes'
  | 'executionStrategy'
  | 'plansService'
  | 'previewProvenanceConfig'
  | 'selectionIntent'
  | 'sessionContext'
  | 'shellFeedback'
  | 'flushDraftForExecution'
  | 'workspaceNodeIds'
  | 'workspaceFilesQuery'
  | 'workspaceFileContentCommand'
  | 'graphDbtWorkspaceArtifactPublicationCommand'
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
  selectionIntent,
  sessionContext,
  shellFeedback,
  flushDraftForExecution,
  transformationValidation,
  workspaceNodeIds,
  workspaceFilesQuery,
  workspaceFileContentCommand,
  graphDbtWorkspaceArtifactPublicationCommand,
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
    const planCanonicalEdges = flushedDraftGraph?.canonicalEdges ?? canonicalEdges;
    const planCanonicalNodes = flushedDraftGraph?.canonicalNodes ?? canonicalNodes;
    const planWorkspaceNodeIds = flushedDraftGraph?.workspaceNodeIds ?? workspaceNodeIds;
    const planTransformationValidation =
      flushedDraftGraph?.ok === true
        ? validateTransformationGraph({
            nodes: planCanonicalNodes,
            edges: planCanonicalEdges,
            selectedNodeIds: selectionIntent.nodeIds,
            workspaceNodeIds: planWorkspaceNodeIds,
          })
        : transformationValidation;

    const result = await executeCanvasPlanAction({
      canPlan,
      canonicalEdges: planCanonicalEdges,
      canonicalNodes: planCanonicalNodes,
      executionStrategy,
      plansService,
      previewProvenanceConfig,
      selectionIntent,
      sessionContext,
      transformationValidation: planTransformationValidation,
      workspaceNodeIds: planWorkspaceNodeIds,
      workspaceFilesQuery,
      workspaceFileContentCommand,
      graphDbtWorkspaceArtifactPublicationCommand,
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
    selectionIntent,
    sessionContext,
    transformationValidation,
    workspaceNodeIds,
    workspaceFilesQuery,
    workspaceFileContentCommand,
    graphDbtWorkspaceArtifactPublicationCommand,
    queryClient,
    shellFeedback,
    flushDraftForExecution,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
  ]);
}
