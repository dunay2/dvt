/** Project canonical cards while preserving active drag geometry and disclosure state. */
import type { Node } from '@xyflow/react';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftEdge } from './canvasDraftSession';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { reconcileDbtModelConnectedOrigin } from './canvasDbtAuthoringModel';
import type { buildCanvasConnectionCompatibilityByNodeId } from './canvasConnectionCompatibilityPresenter';

type VisibleViewportEdge = CanvasDraftEdge;
type PersistedNodePositions = Record<string, { x: number; y: number }>;
type ViewportNodeById = ReadonlyMap<string, Node>;

export function resolveVisibleCanonicalNodes(
  visibleNodeIds: readonly string[],
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): CanonicalNode[] {
  return visibleNodeIds
    .map((nodeId) => canonicalNodesById.get(nodeId))
    .filter((node): node is CanonicalNode => node != null);
}

export function projectViewportNodes(args: {
  visibleNodeIds: readonly string[];
  visibleEdges: readonly VisibleViewportEdge[];
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: PersistedNodePositions;
  frozenNodeIds: ReadonlySet<string>;
  portCompatibilityByNodeId: ReturnType<typeof buildCanvasConnectionCompatibilityByNodeId>;
  fallbackNodesById?: ViewportNodeById;
  previousPersistedNodePositions?: PersistedNodePositions;
  locale: string;
  presentationByNodeId: ReadonlyMap<string, CanvasNodePresentationTruth>;
}): Node[] {
  const {
    visibleNodeIds,
    visibleEdges,
    canonicalNodesById,
    columnLevelLineageEnabled,
    persistedNodePositions,
    frozenNodeIds,
    portCompatibilityByNodeId,
    fallbackNodesById,
    previousPersistedNodePositions,
    locale,
  } = args;

  const visibleCanonicalNodes = resolveVisibleCanonicalNodes(visibleNodeIds, canonicalNodesById);

  return visibleCanonicalNodes.map((canonicalNode, index) => {
    const presentedCanonicalNode = reconcileDbtModelConnectedOrigin({
      node: canonicalNode,
      nodes: visibleCanonicalNodes,
      edges: visibleEdges,
    });
    const fallbackNode = fallbackNodesById?.get(canonicalNode.id);
    const persistedPosition = persistedNodePositions[canonicalNode.id];
    const previousPersistedPosition = previousPersistedNodePositions?.[canonicalNode.id];
    const persistedPositionChanged =
      previousPersistedPosition?.x !== persistedPosition?.x ||
      previousPersistedPosition?.y !== persistedPosition?.y;
    const nextPosition =
      fallbackNode?.dragging !== undefined
        ? fallbackNode.position
        : persistedPositionChanged
          ? (persistedPosition ?? fallbackNode?.position)
          : (fallbackNode?.position ?? persistedPosition);

    const projectedNode = mapCanonicalNodeToCanvasNode({
      canonicalNode: presentedCanonicalNode,
      index,
      showColumns: columnLevelLineageEnabled,
      portCompatibility: portCompatibilityByNodeId.get(canonicalNode.id),
      frozen: frozenNodeIds.has(canonicalNode.id),
      presentationTruth: args.presentationByNodeId.get(canonicalNode.id),
      persistedPosition: nextPosition,
      locale,
    });
    return {
      ...projectedNode,
      ...(fallbackNode?.measured == null ? {} : { measured: fallbackNode.measured }),
      data: {
        ...projectedNode.data,
        columnDisclosureExpanded: fallbackNode?.data.columnDisclosureExpanded === true,
      },
    };
  });
}
