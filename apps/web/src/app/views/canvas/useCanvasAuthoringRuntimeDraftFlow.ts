/** Owned concern: compose the draft baseline, semantic projection, lifecycle, and local draft-session state inside the Canvas authoring-runtime component. */
import { useState } from 'react';

import { canvasDraftSession } from './canvasDraftSession';
import type { UseCanvasAuthoringRuntimeDraftFlowArgs } from './canvasAuthoringRuntime.types';
import { useCanvasAuthoringProjection } from './useCanvasAuthoringProjection';
import { useCanvasDraftBaseline } from './useCanvasDraftBaseline';
import { useCanvasDraftLifecycle } from './useCanvasDraftLifecycle';

export function useCanvasAuthoringRuntimeDraftFlow({
  workspaceService,
  workspaceGraphDraftAuthoringPort,
  workspaceLayoutKey,
  columnLevelLineageEnabled,
  persistedNodePositions,
  canPersistDraftTransport,
  workspaceScope,
  previewProvenanceConfig,
  setCanvasNodePositions,
}: UseCanvasAuthoringRuntimeDraftFlowArgs) {
  const [draftSession, setDraftSession] = useState(
    canvasDraftSession.machine.createBootstrapping
  );
  const { draftQueryCache, draftRepository, graphDraftQuery } = useCanvasDraftBaseline({
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey,
  });
  const { graphModel, canonicalSnapshot } = useCanvasAuthoringProjection({
    graphAuthorityQuery: {
      isPending: graphDraftQuery.isPending,
      isError: graphDraftQuery.isError,
      error: graphDraftQuery.error,
    },
    visibleNodeIds: draftSession.workingSet.visibleNodeIds,
    visibleEdges: draftSession.workingSet.visibleEdges,
    draftSemanticGraph: graphDraftQuery.data?.semanticGraph ?? null,
    localCanonicalNodes: Object.values(draftSession.localNodeCatalog ?? {}),
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
    graphAuthorityQuery: graphModel.graphAuthorityQuery,
    canPersistGraphDraft: canPersistDraftTransport,
    workspaceScope,
    previewProvenanceConfig,
    setCanvasNodePositions,
  });

  return {
    graphModel,
    draftReadModel: graphDraftQuery.data,
    draftSession,
    setDraftSession,
    ...lifecycle,
  };
}
