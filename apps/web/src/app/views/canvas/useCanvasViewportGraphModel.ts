/** Owned concern: project semantic authoring truth into React Flow viewport state only. */
import { useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react';
import { useEffect, useMemo } from 'react';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasConnectionCompatibilityByNodeId } from './canvasConnectionCompatibilityPresenter';
import { createCanvasDirectionalEdge, mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { resolveCanvasAuthoringVisibleEdgeId } from './canvasAuthoringGraphProjection';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

type UseCanvasViewportGraphModelArgs = {
  visibleNodeIds: string[];
  visibleEdges: Array<{ sourceId: string; targetId: string }>;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: Record<string, { x: number; y: number }>;
  frozenNodeIds?: ReadonlySet<string>;
};

type VisibleViewportEdge = UseCanvasViewportGraphModelArgs['visibleEdges'][number];
type PersistedNodePositions = UseCanvasViewportGraphModelArgs['persistedNodePositions'];
type ViewportNodeById = ReadonlyMap<string, Node>;

function resolveVisibleCanonicalNodes(
  visibleNodeIds: readonly string[],
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>
): CanonicalNode[] {
  return visibleNodeIds
    .map((nodeId) => canonicalNodesById.get(nodeId))
    .filter((node): node is CanonicalNode => node != null);
}

function projectViewportNodes(args: {
  visibleNodeIds: readonly string[];
  visibleEdges: readonly VisibleViewportEdge[];
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  columnLevelLineageEnabled: boolean;
  persistedNodePositions: PersistedNodePositions;
  frozenNodeIds: ReadonlySet<string>;
  portCompatibilityByNodeId: ReturnType<typeof buildCanvasConnectionCompatibilityByNodeId>;
  fallbackNodesById?: ViewportNodeById;
  locale: string;
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
    locale,
  } = args;

  const visibleCanonicalNodes = resolveVisibleCanonicalNodes(visibleNodeIds, canonicalNodesById);

  return visibleCanonicalNodes.map((canonicalNode, index) => {
    const fallbackNode = fallbackNodesById?.get(canonicalNode.id);
    const liveGesturePosition =
      fallbackNode?.dragging === undefined ? undefined : fallbackNode.position;

    return mapCanonicalNodeToCanvasNode({
      canonicalNode,
      index,
      showColumns: columnLevelLineageEnabled,
      portCompatibility: portCompatibilityByNodeId.get(canonicalNode.id),
      frozen: frozenNodeIds.has(canonicalNode.id),
      presentationTruth: projectCanvasNodePresentationTruth({
        node: canonicalNode,
        nodes: visibleCanonicalNodes,
        edges: visibleEdges,
      }),
      persistedPosition:
        liveGesturePosition ?? persistedNodePositions[canonicalNode.id] ?? fallbackNode?.position,
      locale,
    });
  });
}

function projectViewportEdges(args: {
  visibleEdges: readonly VisibleViewportEdge[];
  allowedNodeIds: ReadonlySet<string>;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
}): Edge[] {
  const { visibleEdges, allowedNodeIds, canonicalEdgeIdBySignature } = args;

  return visibleEdges
    .filter((edge) => allowedNodeIds.has(edge.sourceId) && allowedNodeIds.has(edge.targetId))
    .map((edge) =>
      createCanvasDirectionalEdge({
        id: resolveCanvasAuthoringVisibleEdgeId({
          edge,
          canonicalEdgeIdBySignature,
        }),
        source: edge.sourceId,
        target: edge.targetId,
      })
    );
}

function viewportEdgesEqual(left: Edge[], right: Edge[]): boolean {
  return orderedArraysEqual(left, right, viewportEdgeEqual);
}

function viewportNodesEqual(left: Node[], right: Node[]): boolean {
  return orderedArraysEqual(left, right, viewportNodeEqual);
}

function orderedArraysEqual<T>(
  left: readonly T[],
  right: readonly T[],
  areEqual: (leftItem: T, rightItem: T) => boolean
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => areEqual(item, getOrderedArrayItem(right, index)));
}

function getOrderedArrayItem<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Expected ordered array item at index ${index}`);
  }
  return item;
}

function viewportEdgeEqual(left: Edge, right: Edge): boolean {
  return left.id === right.id && left.source === right.source && left.target === right.target;
}

function viewportNodeEqual(left: Node, right: Node): boolean {
  return (
    left.id === right.id &&
    left.draggable === right.draggable &&
    viewportNodePositionEqual(left, right) &&
    viewportNodeDataEqual(left.data, right.data)
  );
}

function viewportNodePositionEqual(left: Node, right: Node): boolean {
  return left.position.x === right.position.x && left.position.y === right.position.y;
}

function viewportNodeDataEqual(left: Node['data'], right: Node['data']): boolean {
  let metadataEqual = left.metadata === right.metadata;
  if (!metadataEqual) {
    try {
      metadataEqual =
        JSON.stringify(left.metadata ?? null) === JSON.stringify(right.metadata ?? null);
    } catch {
      metadataEqual = false;
    }
  }
  const leftTags = Array.isArray(left.tags) ? left.tags : [];
  const rightTags = Array.isArray(right.tags) ? right.tags : [];
  const tagsEqual =
    leftTags.length === rightTags.length &&
    leftTags.every((tag, index) => tag === rightTags[index]);
  let portCompatibilityEqual = left.portCompatibility === right.portCompatibility;
  if (!portCompatibilityEqual) {
    try {
      portCompatibilityEqual =
        JSON.stringify(left.portCompatibility ?? null) ===
        JSON.stringify(right.portCompatibility ?? null);
    } catch {
      portCompatibilityEqual = false;
    }
  }
  let presentationTruthEqual = left.presentationTruth === right.presentationTruth;
  if (!presentationTruthEqual) {
    try {
      presentationTruthEqual =
        JSON.stringify(left.presentationTruth ?? null) ===
        JSON.stringify(right.presentationTruth ?? null);
    } catch {
      presentationTruthEqual = false;
    }
  }
  const localizedPresentationEqual =
    JSON.stringify({
      contextMenuCopy: left.contextMenuCopy,
      executionSelectionCopy: left.executionSelectionCopy,
      portLabels: left.portLabels,
      presentationCopy: left.presentationCopy,
    }) ===
    JSON.stringify({
      contextMenuCopy: right.contextMenuCopy,
      executionSelectionCopy: right.executionSelectionCopy,
      portLabels: right.portLabels,
      presentationCopy: right.presentationCopy,
    });

  return (
    left.showColumns === right.showColumns &&
    left.name === right.name &&
    left.description === right.description &&
    left.path === right.path &&
    left.status === right.status &&
    tagsEqual &&
    portCompatibilityEqual &&
    presentationTruthEqual &&
    localizedPresentationEqual &&
    metadataEqual
  );
}

export function useCanvasViewportGraphModel({
  visibleNodeIds,
  visibleEdges,
  canonicalNodesById,
  canonicalEdgeIdBySignature,
  columnLevelLineageEnabled,
  persistedNodePositions,
  frozenNodeIds = new Set(),
}: UseCanvasViewportGraphModelArgs) {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
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
    ]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      projectViewportEdges({
        visibleEdges,
        allowedNodeIds: new Set(visibleNodeIds),
        canonicalEdgeIdBySignature,
      }),
    [canonicalEdgeIdBySignature, visibleEdges, visibleNodeIds]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
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
        locale: applicationLanguage,
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
  ]);

  useEffect(() => {
    setEdges((currentEdges) => {
      const nextEdges = projectViewportEdges({
        visibleEdges,
        allowedNodeIds: new Set(nodes.map((node) => node.id)),
        canonicalEdgeIdBySignature,
      });

      return viewportEdgesEqual(currentEdges, nextEdges) ? currentEdges : nextEdges;
    });
  }, [canonicalEdgeIdBySignature, nodes, setEdges, visibleEdges]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
  };
}
