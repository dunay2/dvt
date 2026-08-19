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
import { projectCanvasPreviewOutcome } from './canvasPreviewOutcomeProjection';
import type { PlanPreviewOutcome } from '../../ports/plans';
import type { CanvasExecutionState } from './canvasExecutionState';
import { validateTransformationGraph } from './transformationGraphValidation';

type UseCanvasPlanActionHandlerArgs = Pick<
  UseCanvasExecutionActionsParams,
  | 'graphDraftCanvasId'
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
  | 'graphDbtModelCompilationQuery'
  | 'setCurrentPlan'
> & {
  transformationValidation: CanvasExecutionState['transformationValidation'];
  setLastPlannedDraftSignature: SetLastPlannedDraftSignature;
  setPlanModalOpen: SetPlanModalOpen;
  setLatestPreviewOutcome: (outcome: PlanPreviewOutcome | null) => void;
};

export function useCanvasPlanActionHandler({
  graphDraftCanvasId,
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
  graphDbtModelCompilationQuery,
  setCurrentPlan,
  setLastPlannedDraftSignature,
  setPlanModalOpen,
  setLatestPreviewOutcome,
}: UseCanvasPlanActionHandlerArgs): Readonly<{
  handlePreviewExecutionPlan: () => Promise<void>;
}> {
  const queryClient = useQueryClient();

  const handlePreviewExecutionPlan = useCallback(async () => {
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
      graphDraftCanvasId,
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
      graphDbtModelCompilationQuery,
    });

    if (!result.ok) {
      shellFeedback.error(result.message);
      return;
    }

    const { tenantId, projectId, environmentId } = sessionContext.getWorkspaceScopeSnapshot();
    const workspaceLayoutKey = `${tenantId}::${projectId}::${environmentId}`;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.workspace.fileTree(workspaceLayoutKey),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.workspace.artifacts(workspaceLayoutKey),
    });
    if (previewProvenanceConfig.graphArtifactPath) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.fileContent(
          workspaceLayoutKey,
          previewProvenanceConfig.graphArtifactPath
        ),
      });
    }
    for (const artifactPath of result.writtenArtifactPaths) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.fileContent(workspaceLayoutKey, artifactPath),
      });
    }

    const projection = projectCanvasPreviewOutcome(result.previewOutcome);
    setLatestPreviewOutcome(result.previewOutcome);
    setCurrentPlan(projection.currentPlan);
    setLastPlannedDraftSignature(projection.currentPlan == null ? null : result.draftSignature);

    if (result.previewOutcome.kind === 'accepted') {
      setPlanModalOpen(true);
      shellFeedback.success(canvasViewCopy.planCreatedMessage);
      return;
    }

    setPlanModalOpen(true);
  }, [
    graphDraftCanvasId,
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
    graphDbtModelCompilationQuery,
    queryClient,
    shellFeedback,
    flushDraftForExecution,
    setCurrentPlan,
    setLastPlannedDraftSignature,
    setPlanModalOpen,
    setLatestPreviewOutcome,
  ]);

  return {
    handlePreviewExecutionPlan,
  };
}
