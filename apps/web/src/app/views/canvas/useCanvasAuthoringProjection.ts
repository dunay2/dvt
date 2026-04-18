import { useMemo } from 'react';

import { buildCanvasCanonicalSnapshot } from './canvasCanonicalSnapshot';
import { useCanvasGraphModel } from './useCanvasGraphModel';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

type UseCanvasAuthoringProjectionArgs = {
  workspaceLayoutKey: string;
  visibleNodeIds: string[];
  visibleEdges: Array<{ sourceId: string; targetId: string }>;
  workspaceService: {
    getGraphSnapshot: () => Promise<{ nodes: Array<{ id: string }>; edges: Array<{ id: string }> }>;
  };
  graphStrategy: {
    mapNodeToCanonical: (node: { id: string }) => CanonicalNode | null;
    mapEdgeToCanonical: (edge: { id: string }) => CanonicalEdge | null;
  };
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: Record<string, { x: number; y: number }>;
};

export function useCanvasAuthoringProjection({
  workspaceLayoutKey,
  visibleNodeIds,
  visibleEdges,
  workspaceService,
  graphStrategy,
  columnLevelLineageEnabled,
  persistedNodePositions,
}: UseCanvasAuthoringProjectionArgs) {
  const graphModel = useCanvasGraphModel({
    workspaceLayoutKey,
    visibleNodeIds,
    visibleEdges,
    workspaceService,
    graphStrategy,
    columnLevelLineageEnabled,
    persistedNodePositions,
  });
  const canonicalSnapshot = useMemo(
    () => buildCanvasCanonicalSnapshot(graphModel.canonicalNodes, graphModel.canonicalEdges),
    [graphModel.canonicalEdges, graphModel.canonicalNodes]
  );

  return {
    graphModel,
    canonicalSnapshot,
  };
}
