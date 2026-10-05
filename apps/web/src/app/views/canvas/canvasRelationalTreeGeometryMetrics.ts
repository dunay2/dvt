/** Owned concern: measure variable relational-card bounds before positioning their edges. */
import {
  canvasRelationalInputOwner,
  canvasRelationalInputPortHeight,
} from './canvasRelationalInputPorts';
import type {
  CanvasRelationalTreeNode,
  CanvasRelationalTreeChildRole,
} from './canvasRelationalTreeProjection';

export type CanvasRelationalTreeNodeSize = Readonly<{ width: number; height: number }>;
export type CardPosition = Readonly<{ x: number; y: number }>;
export type CanvasRelationalTreePlacedNode = Readonly<
  CardPosition &
    CanvasRelationalTreeNodeSize & {
      node: CanvasRelationalTreeNode;
      level: number;
      parentLocator: string | null;
      role: CanvasRelationalTreeChildRole | null;
      ordinal: number;
      siblingCount: number;
    }
>;
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
const DEFAULT_SIZE: CanvasRelationalTreeNodeSize = { width: 224, height: 76 };
const GAP = 48;

export function measureCanvasRelationalTree(
  root: CanvasRelationalTreeNode,
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>
) {
  const depths = new Map<string, number>();
  const spans = new Map<string, number>();
  const widths = new Map<number, number>();
  const rows = new Map<string, number>();
  const sizeFor = (node: CanvasRelationalTreeNode) => {
    const size = sizes.get(node.locator) ?? DEFAULT_SIZE;
    return {
      ...size,
      height: Math.max(
        size.height,
        canvasRelationalInputPortHeight(canvasRelationalInputOwner(node))
      ),
    };
  };
  const measure = (node: CanvasRelationalTreeNode): number => {
    const childDepths = node.children.map((child) => measure(child.node));
    const depth = childDepths.length === 0 ? 0 : Math.max(...childDepths) + 1;
    const childrenHeight =
      node.children.reduce((sum, child) => sum + spans.get(child.node.locator)!, 0) +
      Math.max(0, node.children.length - 1) * GAP;
    depths.set(node.locator, depth);
    spans.set(node.locator, Math.max(sizeFor(node).height, childrenHeight));
    widths.set(depth, Math.max(widths.get(depth) ?? 0, sizeFor(node).width));
    return depth;
  };
  const rootDepth = measure(root);
  const columnLeft: number[] = [36];
  for (let depth = 1; depth <= rootDepth; depth += 1) {
    columnLeft.push(columnLeft[depth - 1]! + widths.get(depth - 1)! + 72);
  }
  const placeRows = (node: CanvasRelationalTreeNode, top: number): void => {
    const span = spans.get(node.locator)!;
    rows.set(node.locator, top + (span - sizeFor(node).height) / 2);
    const childrenHeight =
      node.children.reduce((sum, child) => sum + spans.get(child.node.locator)!, 0) +
      Math.max(0, node.children.length - 1) * GAP;
    let childTop = top + (span - childrenHeight) / 2;
    for (const child of node.children) {
      placeRows(child.node, childTop);
      childTop += spans.get(child.node.locator)! + GAP;
    }
  };
  placeRows(root, 36);
  return { depths, rootDepth, rows, columnLeft, sizeFor };
}
