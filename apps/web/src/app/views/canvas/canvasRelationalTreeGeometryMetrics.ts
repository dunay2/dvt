/** Owned concern: measure variable relational-card bounds before positioning their edges. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

export type CanvasRelationalTreeNodeSize = Readonly<{ width: number; height: number }>;
const DEFAULT_SIZE: CanvasRelationalTreeNodeSize = { width: 224, height: 76 };
const GAP = 34;

export function measureCanvasRelationalTree(
  root: CanvasRelationalTreeNode,
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>
) {
  const depths = new Map<string, number>();
  const spans = new Map<string, number>();
  const widths = new Map<number, number>();
  const rows = new Map<string, number>();
  const sizeFor = (node: CanvasRelationalTreeNode) => sizes.get(node.locator) ?? DEFAULT_SIZE;
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
