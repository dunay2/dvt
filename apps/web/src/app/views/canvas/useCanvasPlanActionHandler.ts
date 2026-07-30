/** Owned concern: bind Canvas plan command handling to minimal execution ports. */
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

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
import type { GraphSqlReplacementAuthorization } from './dbtGraphWorkspaceArtifactPublisher';

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
}: UseCanvasPlanActionHandlerArgs): Readonly<{
  handlePreviewExecutionPlan: () => Promise<void>;
  graphSqlReplacementConfirmation: {
    open: boolean;
    paths: readonly string[];
    busy: boolean;
  };
  confirmGraphSqlReplacement: () => Promise<void>;
  cancelGraphSqlReplacement: () => void;
}> {
  const queryClient = useQueryClient();
  const [replacementRequests, setReplacementRequests] = useState<
    readonly GraphSqlReplacementAuthorization[]
  >([]);
  const [replacementBusy, setReplacementBusy] = useState(false);

  const runPreview = useCallback(
    async (graphSqlReplacementAuthorizations?: readonly GraphSqlReplacementAuthorization[]) => {
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
        graphSqlReplacementAuthorizations,
      });

      if (!result.ok) {
        if (result.kind === 'graph_sql_replacement_confirmation_required') {
          setReplacementRequests(result.replacementRequests);
          return;
        }
        setReplacementRequests([]);
        shellFeedback.error(result.message);
        return;
      }

      setReplacementRequests([]);
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
    },
    [
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
    ]
  );

  const handlePreviewExecutionPlan = useCallback(async () => {
    await runPreview();
  }, [runPreview]);

  const confirmGraphSqlReplacement = useCallback(async () => {
    if (replacementRequests.length === 0 || replacementBusy) {
      return;
    }

    setReplacementBusy(true);
    try {
      await runPreview(replacementRequests);
    } finally {
      setReplacementBusy(false);
    }
  }, [replacementBusy, replacementRequests, runPreview]);

  const cancelGraphSqlReplacement = useCallback(() => {
    if (!replacementBusy) {
      setReplacementRequests([]);
    }
  }, [replacementBusy]);

  return {
    handlePreviewExecutionPlan,
    graphSqlReplacementConfirmation: {
      open: replacementRequests.length > 0,
      paths: replacementRequests.map((request) => request.path),
      busy: replacementBusy,
    },
    confirmGraphSqlReplacement,
    cancelGraphSqlReplacement,
  };
}
