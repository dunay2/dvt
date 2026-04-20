import { useState } from 'react';

import { createBootstrappingCanvasDraftSession } from './canvasDraftSession';
import { useCanvasAuthoringProjection } from './useCanvasAuthoringProjection';
import { useCanvasDraftBaseline } from './useCanvasDraftBaseline';
import { useCanvasDraftLifecycle } from './useCanvasDraftLifecycle';
import type { UseCanvasAuthoringRuntimeArgs } from './useCanvasAuthoringRuntime';

type UseCanvasAuthoringRuntimeDraftFlowArgs = Pick<
  UseCanvasAuthoringRuntimeArgs,
  | 'workspaceService'
  | 'workspaceGraphDraftAuthoringPort'
  | 'workspaceLayoutKey'
  | 'graphStrategy'
  | 'columnLevelLineageEnabled'
  | 'persistedNodePositions'
  | 'workspaceScope'
  | 'previewProvenanceConfig'
  | 'setCanvasNodePositions'
> & {
  canPersistDraftTransport: boolean;
};

export function useCanvasAuthoringRuntimeDraftFlow({
  workspaceService,
  workspaceGraphDraftAuthoringPort,
  workspaceLayoutKey,
  graphStrategy,
  columnLevelLineageEnabled,
  persistedNodePositions,
  canPersistDraftTransport,
  workspaceScope,
  previewProvenanceConfig,
  setCanvasNodePositions,
}: UseCanvasAuthoringRuntimeDraftFlowArgs) {
  const [draftSession, setDraftSession] = useState(createBootstrappingCanvasDraftSession);
  const { draftQueryCache, draftRepository, graphDraftQuery } = useCanvasDraftBaseline({
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey,
  });
  const { graphModel, canonicalSnapshot } = useCanvasAuthoringProjection({
    workspaceLayoutKey,
    visibleNodeIds: draftSession.workingSet.visibleNodeIds,
    visibleEdges: draftSession.workingSet.visibleEdges,
    workspaceService,
    graphStrategy,
    columnLevelLineageEnabled,
    persistedNodePositions,
  });
  const lifecycle = useCanvasDraftLifecycle({
    draftRepository,
    graphDraftQuery,
    draftQueryCache,
    workspaceLayoutKey,
    draftSession,
    setDraftSession,
    canonicalSnapshot,
    graphNodes: graphModel.nodes,
    canonicalNodes: graphModel.canonicalNodes,
    canonicalEdges: graphModel.canonicalEdges,
    graphSnapshotQuery: {
      isPending: graphModel.graphSnapshotQuery.isPending,
      isError: graphModel.graphSnapshotQuery.isError,
    },
    canPersistGraphDraft: canPersistDraftTransport,
    workspaceScope,
    previewProvenanceConfig,
    setCanvasNodePositions,
    graphStrategy,
  });

  return {
    graphModel,
    draftReadModel: graphDraftQuery.data,
    draftSession,
    setDraftSession,
    ...lifecycle,
  };
}
