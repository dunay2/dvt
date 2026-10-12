/** Owned concern: project semantic authoring truth into React Flow viewport state only. */
import { useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react';
import { useEffect, useMemo, useRef } from 'react';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasConnectionCompatibilityByNodeId } from './canvasConnectionCompatibilityPresenter';
import { projectViewportNodes, resolveVisibleCanonicalNodes } from './canvasViewportNodeProjection';
import { viewportNodesEqual } from './canvasViewportNodeEquality';
import { useCanvasNodePresentations } from './useCanvasNodePresentations';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasDraftEdge } from './canvasDraftSession';
import {
  canvasViewportEdgesEqual,
  projectCanvasViewportEdges,
} from './canvasViewportEdgeProjection';

type UseCanvasViewportGraphModelArgs = {
  visibleNodeIds: string[];
  visibleEdges: CanvasDraftEdge[];
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
  canonicalEdgeBySignature?: ReadonlyMap<string, CanonicalEdge>;
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: Record<string, { x: number; y: number }>;
  frozenNodeIds?: ReadonlySet<string>;
};

export function useCanvasViewportGraphModel({
  visibleNodeIds,
  visibleEdges,
  canonicalNodesById,
  canonicalEdgeIdBySignature,
  canonicalEdgeBySignature = new Map(),
  columnLevelLineageEnabled,
  persistedNodePositions,
  frozenNodeIds = new Set(),
}: UseCanvasViewportGraphModelArgs) {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const presentationByNodeId = useCanvasNodePresentations({
    nodes: resolveVisibleCanonicalNodes(visibleNodeIds, canonicalNodesById),
    edges: visibleEdges,
  });
  const portCompatibilityByNodeId = useMemo(
    () =>
      buildCanvasConnectionCompatibilityByNodeId({
        visibleNodeIds,
        visibleEdges,
        canonicalNodesById,
        pluginPortMap: getPluginPortMap(),
      }),
    [canonicalNodesById, visibleEdges, visibleNodeIds]
  );

  const initialNodes: Node[] = useMemo(
    () =>
      projectViewportNodes({
        visibleNodeIds,
        visibleEdges,
        canonicalNodesById,
        columnLevelLineageEnabled,
        persistedNodePositions,
        frozenNodeIds,
        portCompatibilityByNodeId,
        locale: applicationLanguage,
        presentationByNodeId,
      }),
    [
      canonicalNodesById,
      columnLevelLineageEnabled,
      persistedNodePositions,
      frozenNodeIds,
      portCompatibilityByNodeId,
      visibleEdges,
      visibleNodeIds,
      applicationLanguage,
      presentationByNodeId,
    ]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      projectCanvasViewportEdges({
        visibleEdges,
        allowedNodeIds: new Set(visibleNodeIds.filter((nodeId) => canonicalNodesById.has(nodeId))),
        canonicalEdgeIdBySignature,
        canonicalEdgeBySignature,
        canonicalNodesById,
        locale: applicationLanguage,
      }),
    [
      applicationLanguage,
      canonicalEdgeIdBySignature,
      canonicalEdgeBySignature,
      canonicalNodesById,
      visibleEdges,
      visibleNodeIds,
    ]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const previousPersistedNodePositionsRef = useRef(persistedNodePositions);

  useEffect(() => {
    const previousPersistedNodePositions = previousPersistedNodePositionsRef.current;
    previousPersistedNodePositionsRef.current = persistedNodePositions;
    setNodes((currentNodes) => {
      const nextNodes = projectViewportNodes({
        visibleNodeIds,
        visibleEdges,
        canonicalNodesById,
        columnLevelLineageEnabled,
        persistedNodePositions,
        frozenNodeIds,
        portCompatibilityByNodeId,
        fallbackNodesById: new Map(currentNodes.map((node) => [node.id, node])),
        previousPersistedNodePositions,
        locale: applicationLanguage,
        presentationByNodeId,
      });

      return viewportNodesEqual(currentNodes, nextNodes) ? currentNodes : nextNodes;
    });
  }, [
    canonicalNodesById,
    columnLevelLineageEnabled,
    persistedNodePositions,
    frozenNodeIds,
    portCompatibilityByNodeId,
    setNodes,
    visibleEdges,
    visibleNodeIds,
    applicationLanguage,
    presentationByNodeId,
  ]);

  useEffect(() => {
    setEdges((currentEdges) =>
      canvasViewportEdgesEqual(currentEdges, initialEdges) ? currentEdges : initialEdges
    );
  }, [initialEdges, setEdges]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
  };
}
