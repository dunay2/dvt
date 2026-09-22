/** Owned concern: calculate deterministic left-to-right geometry for one relational tree. */
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import {
  measureCanvasRelationalTree,
  type CanvasRelationalTreeNodeSize,
} from './canvasRelationalTreeGeometryMetrics';

export type CardPosition = Readonly<{ x: number; y: number }>;

const NODE_HEIGHT = 76;
const HORIZONTAL_PADDING = 36;
const OUTPUT_GAP = 64;
const OUTPUT_WIDTH = 156;
const BOTTOM_PADDING = 36;

export type CanvasRelationalTreePlacedNode = Readonly<{
  node: CanvasRelationalTreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  parentLocator: string | null;
  role: CanvasRelationalTreeChildRole | null;
  ordinal: number;
  siblingCount: number;
}>;

export type CanvasRelationalTreePlacedEdge = Readonly<{
  key: string;
  parentLocator: string;
  role: CanvasRelationalTreeChildRole;
  ordinal: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}>;

export type CanvasRelationalTreeLayout = Readonly<{
  width: number;
  height: number;
  output: Readonly<{ x: number; y: number; width: number; height: number }>;
  nodes: readonly CanvasRelationalTreePlacedNode[];
  edges: readonly CanvasRelationalTreePlacedEdge[];
}>;

export function layoutCanvasRelationalTree(
  root: CanvasRelationalTreeNode,
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize> = new Map(),
  positions: ReadonlyMap<string, CardPosition> = new Map()
): CanvasRelationalTreeLayout {
  const { depths, rootDepth, rows, columnLeft, sizeFor } = measureCanvasRelationalTree(root, sizes);
  const nodes: CanvasRelationalTreePlacedNode[] = [];
  const edges: CanvasRelationalTreePlacedEdge[] = [];
  const positionFor = (node: CanvasRelationalTreeNode): CardPosition =>
    positions.get(node.relationId ?? node.locator) ?? {
      x: columnLeft[depths.get(node.locator) ?? 0]!,
      y: rows.get(node.locator)!,
    };

  const place = (
    node: CanvasRelationalTreeNode,
    parentLocator: string | null,
    role: CanvasRelationalTreeChildRole | null,
    ordinal: number,
    siblingCount: number
  ): void => {
    const depth = depths.get(node.locator) ?? 0;
    const { x, y } = positionFor(node);
    nodes.push({
      node,
      x,
      y,
      ...sizeFor(node),
      level: rootDepth - depth + 1,
      parentLocator,
      role,
      ordinal,
      siblingCount,
    });

    node.children.forEach((child, index) => {
      const { x: childX, y: childY } = positionFor(child.node);
      edges.push({
        key: `${node.locator}:${child.role}:${child.ordinal}`,
        parentLocator: node.locator,
        role: child.role,
        ordinal: child.ordinal,
        fromX: childX + sizeFor(child.node).width,
        fromY: childY + NODE_HEIGHT / 2,
        toX: x,
        toY: y + ((index + 1) * NODE_HEIGHT) / (node.children.length + 1),
      });
      place(child.node, node.locator, child.role, child.ordinal, node.children.length);
    });
  };

  place(root, null, null, 0, 1);
  const rootNode = nodes[0]!;
  const output = {
    x: rootNode.x + rootNode.width + OUTPUT_GAP,
    y: rootNode.y,
    width: OUTPUT_WIDTH,
    height: NODE_HEIGHT,
  };
  return {
    width:
      Math.max(output.x + OUTPUT_WIDTH, ...nodes.map((node) => node.x + node.width)) +
      HORIZONTAL_PADDING,
    height:
      Math.max(...nodes.map((node) => node.y + node.height), output.y + output.height) +
      BOTTOM_PADDING,
    output,
    nodes,
    edges,
  };
}
