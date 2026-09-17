/** Owned concern: calculate deterministic geometry for one canonical relational tree. */
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';

const NODE_WIDTH = 176;
const NODE_HEIGHT = 58;
const HORIZONTAL_GAP = 48;
const VERTICAL_GAP = 104;
const HORIZONTAL_PADDING = 48;
const OUTPUT_TOP = 16;
const ROOT_TOP = 88;
const BOTTOM_PADDING = 40;

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

function measureSubtrees(node: CanvasRelationalTreeNode, widths: Map<string, number>): number {
  const childrenWidth = node.children.reduce(
    (total, child, index) =>
      total + measureSubtrees(child.node, widths) + (index === 0 ? 0 : HORIZONTAL_GAP),
    0
  );
  const width = Math.max(NODE_WIDTH, childrenWidth);
  widths.set(node.locator, width);
  return width;
}

export function layoutCanvasRelationalTree(
  root: CanvasRelationalTreeNode
): CanvasRelationalTreeLayout {
  const widths = new Map<string, number>();
  const treeWidth = measureSubtrees(root, widths);
  const nodes: CanvasRelationalTreePlacedNode[] = [];
  const edges: CanvasRelationalTreePlacedEdge[] = [];

  const place = (
    node: CanvasRelationalTreeNode,
    originX: number,
    level: number,
    parentLocator: string | null,
    role: CanvasRelationalTreeChildRole | null,
    ordinal: number,
    siblingCount: number
  ): void => {
    const subtreeWidth = widths.get(node.locator) ?? NODE_WIDTH;
    const x = originX + (subtreeWidth - NODE_WIDTH) / 2;
    const y = ROOT_TOP + (level - 1) * VERTICAL_GAP;
    nodes.push({
      node,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      level,
      parentLocator,
      role,
      ordinal,
      siblingCount,
    });

    let childOriginX = originX;
    node.children.forEach((child) => {
      const childWidth = widths.get(child.node.locator) ?? NODE_WIDTH;
      const childCenterX = childOriginX + childWidth / 2;
      const childY = ROOT_TOP + level * VERTICAL_GAP;
      edges.push({
        key: `${node.locator}:${child.role}:${child.ordinal}`,
        parentLocator: node.locator,
        fromX: x + NODE_WIDTH / 2,
        fromY: y + NODE_HEIGHT,
        toX: childCenterX,
        toY: childY,
      });
      place(
        child.node,
        childOriginX,
        level + 1,
        node.locator,
        child.role,
        child.ordinal,
        node.children.length
      );
      childOriginX += childWidth + HORIZONTAL_GAP;
    });
  };

  place(root, HORIZONTAL_PADDING, 1, null, null, 0, 1);
  const rootNode = nodes[0]!;
  const outputWidth = 72;
  const maxBottom = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    width: treeWidth + HORIZONTAL_PADDING * 2,
    height: maxBottom + BOTTOM_PADDING,
    output: {
      x: rootNode.x + (NODE_WIDTH - outputWidth) / 2,
      y: OUTPUT_TOP,
      width: outputWidth,
      height: 32,
    },
    nodes,
    edges,
  };
}
