/** Owned concern: calculate deterministic left-to-right geometry for one relational tree. */
import type {
  CanvasRelationalTreeChildRole,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';
import {
  measureCanvasRelationalTree,
  type CanvasRelationalTreeNodeSize,
  type CardPosition,
  type CanvasRelationalTreePlacedNode,
  type CanvasRelationalTreePlacedEdge,
} from './canvasRelationalTreeGeometryMetrics';
import { projectCanvasRelationalCardExpansion } from './canvasRelationalCardExpansion';

export type {
  CardPosition,
  CanvasRelationalTreePlacedNode,
  CanvasRelationalTreePlacedEdge,
} from './canvasRelationalTreeGeometryMetrics';
export const CANVAS_RELATIONAL_OUTPUT_POSITION_ID = 'canvas-relational-output';
const NODE_HEIGHT = 76;
const HORIZONTAL_PADDING = 36;
const OUTPUT_GAP = 64;
const OUTPUT_WIDTH = 156;
const BOTTOM_PADDING = 36;

export type CanvasRelationalTreeLayout = Readonly<{
  positionOffsets?: ReadonlyMap<string, CardPosition>;
  width: number;
  height: number;
  output:
    | (CardPosition & CanvasRelationalTreeNodeSize & Readonly<{ inputLocator: string | null }>)
    | null;
  nodes: readonly CanvasRelationalTreePlacedNode[];
  edges: readonly CanvasRelationalTreePlacedEdge[];
}>;

export function layoutCanvasRelationalTree(
  root: CanvasRelationalTreeNode | null,
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize> = new Map(),
  positions: ReadonlyMap<string, CardPosition> = new Map(),
  detached: readonly CanvasRelationalTreeNode[] = []
): CanvasRelationalTreeLayout {
  let effectivePositions = positions;
  let positionOffsets: ReadonlyMap<string, CardPosition> | undefined;
  if (positions.size > 0 && sizes.size > 0) {
    const compact = layoutCanvasRelationalTree(root, new Map(), positions, detached);
    const expanded = projectCanvasRelationalCardExpansion(
      compact,
      sizes,
      CANVAS_RELATIONAL_OUTPUT_POSITION_ID
    );
    effectivePositions = expanded.positions;
    positionOffsets = expanded.offsets;
  }
  const first = root ?? detached[0];
  const output = {
    ...(effectivePositions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID) ?? { x: 320, y: 36 }),
    width: OUTPUT_WIDTH,
    height: NODE_HEIGHT,
    inputLocator: null as string | null,
  };
  if (first == null) return { width: 512, height: 148, output, nodes: [], edges: [] };
  const { depths, rootDepth, rows, columnLeft, sizeFor } = measureCanvasRelationalTree(
    first,
    sizes
  );
  const nodes: CanvasRelationalTreePlacedNode[] = [];
  const edges: CanvasRelationalTreePlacedEdge[] = [];
  const positionFor = (node: CanvasRelationalTreeNode): CardPosition =>
    effectivePositions.get(node.relationId ?? node.locator) ?? {
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
        fromY: childY + sizeFor(child.node).height / 2,
        toX: x,
        toY: y + ((index + 1) * sizeFor(node).height) / (node.children.length + 1),
      });
      place(child.node, node.locator, child.role, child.ordinal, node.children.length);
    });
  };

  if (root != null) place(root, null, null, 0, 1);
  const rootNode = nodes[0];
  if (rootNode != null) {
    output.inputLocator = rootNode.node.locator;
    if (!effectivePositions.has(CANVAS_RELATIONAL_OUTPUT_POSITION_ID)) {
      output.x = rootNode.x + rootNode.width + OUTPUT_GAP;
      output.y = rootNode.y;
    }
  }
  const bottom = Math.max(0, ...nodes.map((node) => node.y + node.height)) + BOTTOM_PADDING;
  detached.forEach((node, ordinal) =>
    nodes.push({
      node,
      ...(effectivePositions.get(node.relationId ?? node.locator) ?? {
        x: HORIZONTAL_PADDING,
        y: bottom + ordinal * (NODE_HEIGHT + BOTTOM_PADDING),
      }),
      ...sizeFor(node),
      level: 1,
      parentLocator: null,
      role: null,
      ordinal,
      siblingCount: detached.length,
    })
  );
  const bounds = [...nodes, output];
  return {
    positionOffsets,
    width: Math.max(...bounds.map((node) => node.x + node.width)) + HORIZONTAL_PADDING,
    height: Math.max(...bounds.map((node) => node.y + node.height)) + BOTTOM_PADDING,
    output,
    nodes,
    edges,
  };
}
