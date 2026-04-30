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
  const [draftSession, setDraftSession] = useState(canvasDraftSession.machine.createBootstrapping);
  const { draftQueryCache, draftRepository, graphDraftQuery } = useCanvasDraftBaseline({
    workspaceService,
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey,
  });
  const localCanonicalNodes =
    draftSession.syncState === 'missing_remote'
      ? []
      : Object.values(draftSession.localNodeCatalog ?? {});
  const { graphModel, canonicalSnapshot } = useCanvasAuthoringProjection({
    graphAuthorityQuery: {
      isPending: graphDraftQuery.isPending,
      isError: graphDraftQuery.isError,
      error: graphDraftQuery.error,
    },
    visibleNodeIds: draftSession.workingSet.visibleNodeIds,
    visibleEdges: draftSession.workingSet.visibleEdges,
    draftSemanticGraph: graphDraftQuery.data?.semanticGraph ?? null,
    localCanonicalNodes,
    columnLevelLineageEnabled,
    persistedNodePositions,
  });
  const lifecycle = useCanvasDraftLifecycle({
    baseline: {
      draftRepository,
      graphDraftQuery,
      draftQueryCache,
      graphAuthorityQuery: graphModel.graphAuthorityQuery,
      workspaceLayoutKey,
    },
    session: {
      draftSession,
      setDraftSession,
      canonicalSnapshot,
      persistedNodePositions,
      setCanvasNodePositions,
    },
    projection: {
      graphNodes: graphModel.nodes,
      canonicalNodes: graphModel.canonicalNodes,
      canonicalEdges: graphModel.canonicalEdges,
      workspaceScope,
      previewProvenanceConfig,
    },
    policy: {
      canPersistGraphDraft: canPersistDraftTransport,
    },
  });

  return {
    graphModel,
    draftReadModel: graphDraftQuery.data,
    draftSession,
    setDraftSession,
    ...lifecycle,
  };
}
