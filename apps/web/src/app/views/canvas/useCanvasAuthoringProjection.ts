/** Owned concern: compose semantic authoring projection and viewport projection into one route-facing graph model. */
import { useMemo } from 'react';

import { buildCanvasCanonicalSnapshot } from './canvasCanonicalSnapshot';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import type { CanvasDraftEdge } from './canvasDraftSession';
import type { GraphAuthorityQueryState } from './canvasDraftLifecycle.types';
import { useCanvasViewportGraphModel } from './useCanvasViewportGraphModel';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceGraphDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';

type UseCanvasAuthoringProjectionArgs = {
  graphAuthorityQuery: GraphAuthorityQueryState;
  visibleNodeIds: string[];
  visibleEdges: Array<{ sourceId: string; targetId: string }>;
  draftSemanticGraph: WorkspaceGraphDraftSemanticGraph | null;
  localCanonicalNodes: readonly CanonicalNode[];
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: Record<string, { x: number; y: number }>;
};

function buildAuthoringReconcileSnapshot(args: {
  draftSemanticGraph: WorkspaceGraphDraftSemanticGraph | null;
  localCanonicalNodes: readonly CanonicalNode[];
}) {
  const { draftSemanticGraph, localCanonicalNodes } = args;
  const canonicalNodeIds = [
    ...new Set([
      ...(draftSemanticGraph?.canonicalNodes.map((node) => node.id) ?? []),
      ...localCanonicalNodes.map((node) => node.id),
    ]),
  ];
  const canonicalEdges: CanvasDraftEdge[] = (draftSemanticGraph?.canonicalEdges ?? []).map(
    (edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
    })
  );

  return buildCanvasCanonicalSnapshot(
    canonicalNodeIds.map((id) => ({ id })),
    canonicalEdges
  );
}

export function useCanvasAuthoringProjection({
  graphAuthorityQuery,
  visibleNodeIds,
  visibleEdges,
  draftSemanticGraph,
  localCanonicalNodes,
  columnLevelLineageEnabled,
  persistedNodePositions,
}: UseCanvasAuthoringProjectionArgs) {
  const authoringGraphProjection = useMemo(
    () =>
      buildCanvasAuthoringGraphProjection({
        visibleNodeIds,
        visibleEdges,
        draftSemanticGraph,
        localCanonicalNodes,
      }),
    [draftSemanticGraph, localCanonicalNodes, visibleEdges, visibleNodeIds]
  );
  const viewportGraphModel = useCanvasViewportGraphModel({
    visibleNodeIds,
    visibleEdges,
    canonicalNodesById: authoringGraphProjection.canonicalNodesById,
    canonicalEdgeIdBySignature: authoringGraphProjection.canonicalEdgeIdBySignature,
    columnLevelLineageEnabled,
    persistedNodePositions,
  });
  const canonicalSnapshot = useMemo(
    () =>
      buildAuthoringReconcileSnapshot({
        draftSemanticGraph,
        localCanonicalNodes,
      }),
    [draftSemanticGraph, localCanonicalNodes]
  );

  return {
    graphModel: {
      graphAuthorityQuery,
      canonicalNodes: authoringGraphProjection.canonicalNodes,
      canonicalEdges: authoringGraphProjection.canonicalEdges,
      canonicalNodesById: authoringGraphProjection.canonicalNodesById,
      nodes: viewportGraphModel.nodes,
      edges: viewportGraphModel.edges,
      setNodes: viewportGraphModel.setNodes,
      setEdges: viewportGraphModel.setEdges,
      onNodesChange: viewportGraphModel.onNodesChange,
      onEdgesChange: viewportGraphModel.onEdgesChange,
    },
    canonicalSnapshot,
  };
}
