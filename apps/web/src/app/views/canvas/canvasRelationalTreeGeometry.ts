/** Owned concern: calculate deterministic left-to-right geometry for one relational tree. */
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';

const NODE_WIDTH = 224;
const NODE_HEIGHT = 76;
const HORIZONTAL_GAP = 72;
const VERTICAL_GAP = 34;
const HORIZONTAL_PADDING = 36;
const VERTICAL_PADDING = 36;
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

function measureDepth(node: CanvasRelationalTreeNode, depths: Map<string, number>): number {
  const depth =
    node.children.length === 0
      ? 0
      : Math.max(...node.children.map((child) => measureDepth(child.node, depths))) + 1;
  depths.set(node.locator, depth);
  return depth;
}

function placeRows(root: CanvasRelationalTreeNode): ReadonlyMap<string, number> {
  const rows = new Map<string, number>();
  let nextLeaf = 0;
  const visit = (node: CanvasRelationalTreeNode): number => {
    if (node.children.length === 0) {
      const y = VERTICAL_PADDING + nextLeaf * (NODE_HEIGHT + VERTICAL_GAP);
      nextLeaf += 1;
      rows.set(node.locator, y);
      return y;
    }
    const childRows = node.children.map((child) => visit(child.node));
    const y = (childRows[0]! + childRows.at(-1)!) / 2;
    rows.set(node.locator, y);
    return y;
  };
  visit(root);
  return rows;
}

export function layoutCanvasRelationalTree(
  root: CanvasRelationalTreeNode
): CanvasRelationalTreeLayout {
  const depths = new Map<string, number>();
  const rootDepth = measureDepth(root, depths);
  const rows = placeRows(root);
  const nodes: CanvasRelationalTreePlacedNode[] = [];
  const edges: CanvasRelationalTreePlacedEdge[] = [];
  const columnWidth = NODE_WIDTH + HORIZONTAL_GAP;

  const place = (
    node: CanvasRelationalTreeNode,
    parentLocator: string | null,
    role: CanvasRelationalTreeChildRole | null,
    ordinal: number,
    siblingCount: number
  ): void => {
    const depth = depths.get(node.locator) ?? 0;
    const x = HORIZONTAL_PADDING + depth * columnWidth;
    const y = rows.get(node.locator) ?? VERTICAL_PADDING;
    nodes.push({
      node,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      level: rootDepth - depth + 1,
      parentLocator,
      role,
      ordinal,
      siblingCount,
    });

    node.children.forEach((child, index) => {
      const childDepth = depths.get(child.node.locator) ?? 0;
      const childX = HORIZONTAL_PADDING + childDepth * columnWidth;
      const childY = rows.get(child.node.locator) ?? VERTICAL_PADDING;
      edges.push({
        key: `${node.locator}:${child.role}:${child.ordinal}`,
        parentLocator: node.locator,
        role: child.role,
        ordinal: child.ordinal,
        fromX: childX + NODE_WIDTH,
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
    x: rootNode.x + NODE_WIDTH + OUTPUT_GAP,
    y: rootNode.y,
    width: OUTPUT_WIDTH,
    height: NODE_HEIGHT,
  };
  return {
    width: output.x + OUTPUT_WIDTH + HORIZONTAL_PADDING,
    height:
      Math.max(...nodes.map((node) => node.y + node.height), output.y + output.height) +
      BOTTOM_PADDING,
    output,
    nodes,
    edges,
  };
}
