/** Arrange the semantic graph without reading or changing its canonical meaning. */
import type { Node } from '@xyflow/react';
import type {
  SemanticWorkbenchGraph,
  SemanticWorkbenchNodeData,
} from './semanticWorkbenchProjection';
import { getLayoutedElements } from './canvasGraphUtils';

export function routeEdgesByTransition(
  nodes: readonly Node<SemanticWorkbenchNodeData>[],
  edges: readonly SemanticWorkbenchGraph['edges'][number][]
): SemanticWorkbenchGraph['edges'] {
  const semanticGroupByNodeId = new Map(
    nodes.map((node) => [node.id, node.data.semanticGroup] as const)
  );
  const transitionKey = (edge: SemanticWorkbenchGraph['edges'][number]) =>
    `${edge.data?.semanticEdgeKind ?? 'unknown'}:${semanticGroupByNodeId.get(edge.source) ?? 'unknown'}->${semanticGroupByNodeId.get(edge.target) ?? 'unknown'}`;
  const laneCountByTransition = new Map<string, number>();
  edges.forEach((edge) => {
    const key = transitionKey(edge);
    laneCountByTransition.set(key, (laneCountByTransition.get(key) ?? 0) + 1);
  });
  const laneIndexByTransition = new Map<string, number>();

  return edges.map((edge) => {
    const key = transitionKey(edge);
    const laneIndex = laneIndexByTransition.get(key) ?? 0;
    const laneCount = laneCountByTransition.get(key) ?? 1;
    laneIndexByTransition.set(key, laneIndex + 1);
    return {
      ...edge,
      pathOptions: {
        ...edge.pathOptions,
        stepPosition: (laneIndex + 1) / (laneCount + 1),
      },
    };
  });
}

export function layoutGraph(
  nodes: readonly Node<SemanticWorkbenchNodeData>[],
  edges: readonly SemanticWorkbenchGraph['edges'][number][],
  transformationRankdir: 'LR' | 'TB' = 'TB'
): Node<SemanticWorkbenchNodeData>[] {
  const groups = [
    { id: 'source', label: 'FUENTES', color: '#3b82f6' },
    { id: 'condition', label: 'CONDICIÓN DEL JOIN', color: '#10b981' },
    { id: 'transformation', label: 'TRANSFORMACIÓN', color: '#06b6d4' },
  ] as const;
  const frames: Node<SemanticWorkbenchNodeData>[] = [];
  const positionedNodes: Node<SemanticWorkbenchNodeData>[] = [];
  let groupLeft = 24;

  for (const group of groups) {
    const members = nodes.filter((node) => node.data.semanticGroup === group.id);
    if (members.length === 0) continue;
    const groupNodeId = `semantic-group-${group.id}`;

    const memberIds = new Set(members.map((node) => node.id));
    const memberEdges = edges.filter(
      (edge) => memberIds.has(edge.source) && memberIds.has(edge.target)
    );
    const layouted = getLayoutedElements([...members], memberEdges, {
      rankdir: group.id === 'transformation' ? transformationRankdir : 'LR',
      ranksep: 68,
      nodesep: 30,
      marginx: 0,
      marginy: 0,
      nodeSize: { width: 206, height: 56 },
    }).nodes;

    const bounds = layouted.map((node) => {
      const width = typeof node.style?.width === 'number' ? node.style.width : 184;
      const height = typeof node.style?.minHeight === 'number' ? node.style.minHeight : 56;
      return {
        node,
        left: node.position.x,
        top: node.position.y,
        right: node.position.x + width,
        bottom: node.position.y + height,
      };
    });
    const contentLeft = Math.min(...bounds.map((bound) => bound.left));
    const contentTop = Math.min(...bounds.map((bound) => bound.top));
    const contentRight = Math.max(...bounds.map((bound) => bound.right));
    const contentBottom = Math.max(...bounds.map((bound) => bound.bottom));
    const frameWidth = contentRight - contentLeft + 48;
    const frameHeight = contentBottom - contentTop + 76;

    frames.push({
      id: groupNodeId,
      type: 'group',
      position: { x: groupLeft, y: 24 },
      data: {
        label: group.label,
        semanticKind: 'group',
        semanticGroup: group.id,
        detail: group.label,
      },
      selectable: false,
      draggable: true,
      connectable: false,
      focusable: false,
      zIndex: 0,
      style: {
        width: frameWidth,
        height: frameHeight,
        padding: '10px 12px',
        border: `1px dashed ${group.color}`,
        borderRadius: 10,
        background: `${group.color}0a`,
        color: group.color,
        boxSizing: 'border-box',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textAlign: 'left',
        cursor: 'grab',
      },
    });
    positionedNodes.push(
      ...bounds.map(({ node, left, top }) => ({
        ...node,
        parentId: groupNodeId,
        extent: 'parent' as const,
        draggable: false,
        zIndex: 1,
        position: {
          x: 24 + left - contentLeft,
          y: 44 + top - contentTop,
        },
      }))
    );
    groupLeft += frameWidth + 72;
  }

  return [...frames, ...positionedNodes];
}
