/** Owned concern: bind Canvas plan command handling to minimal execution ports. */
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../queries/queryKeys';
import { canvasViewCopy } from './copy';
import type {
  CanvasPreviewAttempt,
  SetPlanModalOpen,
  UseCanvasExecutionActionsParams,
} from './canvasExecutionActions.types';
import { executeCanvasPlanAction } from './canvasPlanAction';
import { projectCanvasPreviewOutcome } from './canvasPreviewOutcomeProjection';

type UseCanvasPlanActionHandlerArgs = Pick<
  UseCanvasExecutionActionsParams,
  | 'graphDraftCanvasId'
  | 'canPlan'
  | 'canonicalEdges'
  | 'canonicalNodes'
  | 'executionStrategy'
  | 'plansService'
  | 'selectionIntent'
  | 'sessionContext'
  | 'shellFeedback'
  | 'flushDraftForExecution'
  | 'workspaceNodeIds'
  | 'workspaceFilesQuery'
  | 'graphDbtWorkspaceArtifactPublicationCommand'
  | 'graphDbtModelCompilationQuery'
  | 'setCurrentPlan'
> & {
  setPlanModalOpen: SetPlanModalOpen;
  setPreviewAttempt: (attempt: CanvasPreviewAttempt) => void;
};

export function useCanvasPlanActionHandler({
  graphDraftCanvasId,
  canPlan,
  canonicalEdges,
  canonicalNodes,
  executionStrategy,
  plansService,
  selectionIntent,
  sessionContext,
  shellFeedback,
  flushDraftForExecution,
  workspaceNodeIds,
  workspaceFilesQuery,
  graphDbtWorkspaceArtifactPublicationCommand,
  graphDbtModelCompilationQuery,
  setCurrentPlan,
  setPlanModalOpen,
  setPreviewAttempt,
}: UseCanvasPlanActionHandlerArgs): Readonly<{
  handlePreviewExecutionPlan: () => Promise<void>;
}> {
  const queryClient = useQueryClient();

  const handlePreviewExecutionPlan = async (): Promise<void> => {
    const result = await executeCanvasPlanAction({
      graphDraftCanvasId,
      flushDraftForExecution,
      canPlan,
      canonicalEdges,
      canonicalNodes,
      executionStrategy,
      plansService,
      selectionIntent,
      sessionContext,
      workspaceNodeIds,
      workspaceFilesQuery,
      graphDbtWorkspaceArtifactPublicationCommand,
      graphDbtModelCompilationQuery,
    });

    if (!result.ok) {
      shellFeedback.error(result.message);
      return;
    }

    const { tenantId, projectId, environmentId } = sessionContext.getWorkspaceScopeSnapshot();
    const workspaceLayoutKey = `${tenantId}::${projectId}::${environmentId}`;
    if (result.writtenArtifactPaths.length > 0) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.fileTree(workspaceLayoutKey),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.artifacts(workspaceLayoutKey),
      });
    }
    for (const artifactPath of result.writtenArtifactPaths) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.fileContent(workspaceLayoutKey, artifactPath),
      });
    }

    const projection = projectCanvasPreviewOutcome(result.previewOutcome);
    setPreviewAttempt({ outcome: result.previewOutcome, draftSignature: result.draftSignature });
    setCurrentPlan(projection.currentPlan);
    setPlanModalOpen(true);

    if (result.previewOutcome.kind === 'accepted') {
      shellFeedback.success(canvasViewCopy.planCreatedMessage);
    }
  };

  return {
    handlePreviewExecutionPlan,
  };
}
