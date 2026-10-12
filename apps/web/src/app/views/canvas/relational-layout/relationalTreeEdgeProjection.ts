/** Pure edge geometry for canonical, staged and Output connections. */
import type {
  CanvasRelationalTreeLayout,
  CanvasRelationalTreePlacedEdge,
  CanvasRelationalTreePlacedNode,
} from '../canvasRelationalTreeGeometry';
import type { CanvasStagedOperation } from '../canvasStagedOperation';
import {
  canvasRelationalInputOwner,
  canvasRelationalInputPortCount,
  canvasRelationalInputPortOffset,
} from '../canvasRelationalInputPorts';

export function projectCanonicalRelationEdges(
  nodes: readonly CanvasRelationalTreePlacedNode[]
): readonly CanvasRelationalTreePlacedEdge[] {
  const byLocator = new Map(nodes.map((placed) => [placed.node.locator, placed]));
  return nodes.flatMap((target) => {
    const owner = canvasRelationalInputOwner(target.node);
    const count =
      owner == null ? target.node.children.length : canvasRelationalInputPortCount(owner);
    return target.node.children.flatMap((child, index) => {
      const source = byLocator.get(child.node.locator);
      if (source == null) return [];
      return [
        {
          key: `${target.node.locator}:${child.role}:${child.ordinal}`,
          parentLocator: target.node.locator,
          role: child.role,
          ordinal: child.ordinal,
          fromX: source.x + source.width,
          fromY: source.y + source.height / 2,
          toX: target.x,
          toY: target.y + target.height * canvasRelationalInputPortOffset(index, count),
        },
      ];
    });
  });
}

export function relationalEdgePath(edge: CanvasRelationalTreePlacedEdge): string {
  const offset = Math.max(32, (edge.toX - edge.fromX) * 0.45);
  return `M ${edge.fromX} ${edge.fromY} C ${edge.fromX + offset} ${edge.fromY}, ${edge.toX - offset} ${edge.toY}, ${edge.toX} ${edge.toY}`;
}

export function indexPlacedRelations(
  layout: CanvasRelationalTreeLayout
): ReadonlyMap<string, CanvasRelationalTreePlacedNode> {
  return new Map(
    layout.nodes.flatMap((node) =>
      node.node.relationId == null ? [] : [[node.node.relationId, node] as const]
    )
  );
}

export function projectStagedRelationEdges(
  placedByRelationId: ReadonlyMap<string, CanvasRelationalTreePlacedNode>,
  operations: readonly CanvasStagedOperation[]
): readonly CanvasRelationalTreePlacedEdge[] {
  return operations.flatMap((operation) => {
    const target = placedByRelationId.get(operation.id);
    if (target == null) return [];
    return operation.inputs.flatMap((relationId, port) => {
      const source = relationId == null ? undefined : placedByRelationId.get(relationId);
      if (source == null) return [];
      return [
        {
          key: `${operation.id}:${port}:${relationId}`,
          parentLocator: operation.id,
          role: port === 0 ? ('left' as const) : ('right' as const),
          ordinal: port,
          fromX: source.x + source.width,
          fromY: source.y + source.height / 2,
          toX: target.x,
          toY:
            target.y +
            target.height *
              canvasRelationalInputPortOffset(port, canvasRelationalInputPortCount(operation)),
        },
      ];
    });
  });
}
