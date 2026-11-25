/** Owned concern: calculate deterministic left-to-right geometry for one relational tree. */
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import {
  HORIZONTAL_PADDING,
  BOTTOM_PADDING,
  measureCanvasRelationalBounds,
  measureCanvasRelationalTree,
  type CanvasRelationalTreeNodeSize,
  type CardPosition,
  type CanvasRelationalTreePlacedNode,
} from './canvasRelationalTreeGeometryMetrics';
import { projectCanvasRelationalCardExpansion } from './canvasRelationalCardExpansion';
import { projectCanonicalRelationEdges } from './relational-layout/relationalTreeEdgeProjection';
import { placeUnanchoredCanvasCards } from './canvasRelationalUnplacedCards';

export type {
  CardPosition,
  CanvasRelationalTreePlacedNode,
  CanvasRelationalTreePlacedEdge,
} from './canvasRelationalTreeGeometryMetrics';
export const CANVAS_RELATIONAL_OUTPUT_POSITION_ID = 'canvas-relational-output';
const NODE_HEIGHT = 76;
const OUTPUT_GAP = 64;
const OUTPUT_WIDTH = 156;

export type CanvasRelationalTreeLayout = CanvasRelationalTreeNodeSize &
  Readonly<{
    expansionFrame?: Readonly<{ key: string; offsets: ReadonlyMap<string, CardPosition> }>;
    origin: CardPosition;
    output:
      | (CardPosition & CanvasRelationalTreeNodeSize & { readonly inputLocator: string | null })
      | null;
    nodes: readonly CanvasRelationalTreePlacedNode[];
    edges: Readonly<ReturnType<typeof projectCanonicalRelationEdges>>;
  }>;

export function layoutCanvasRelationalTree(
  root: CanvasRelationalTreeNode | null,
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize> = new Map(),
  positions: ReadonlyMap<string, CardPosition> = new Map(),
  detached: readonly CanvasRelationalTreeNode[] = [],
  previousExpansion?: CanvasRelationalTreeLayout['expansionFrame'] | null
): CanvasRelationalTreeLayout {
  const expanded =
    sizes.size > 0 && (positions.size > 0 || previousExpansion !== undefined)
      ? projectCanvasRelationalCardExpansion(
          layoutCanvasRelationalTree(root, new Map(), positions, detached),
          sizes,
          CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
          previousExpansion
        )
      : undefined;
  const effectivePositions = expanded?.positions ?? positions;
  const first = root ?? detached[0];
  const output = {
    ...(effectivePositions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID) ?? { x: 320, y: 36 }),
    width: OUTPUT_WIDTH,
    height: NODE_HEIGHT,
    inputLocator: null as string | null,
  };
  if (first == null)
    return { ...measureCanvasRelationalBounds([output]), output, nodes: [], edges: [] };
  const { depths, rootDepth, rows, columnLeft, sizeFor } = measureCanvasRelationalTree(
    first,
    sizes
  );
  const nodes: CanvasRelationalTreePlacedNode[] = [];
  const positionFor = (node: CanvasRelationalTreeNode): CardPosition =>
    effectivePositions.get(node.relationId ?? node.locator) ?? {
      x: columnLeft[depths.get(node.locator) ?? 0]!,
      y: rows.get(node.locator)!,
    };

  const place = (
    node: CanvasRelationalTreeNode,
    parent: Pick<
      CanvasRelationalTreePlacedNode,
      'parentLocator' | 'role' | 'ordinal' | 'siblingCount'
    >
  ): void => {
    const depth = depths.get(node.locator) ?? 0;
    const { x, y } = positionFor(node);
    nodes.push({
      node,
      x,
      y,
      ...sizeFor(node),
      level: rootDepth - depth + 1,
      ...parent,
    });

    node.children.forEach((child) => {
      place(child.node, {
        parentLocator: node.locator,
        role: child.role,
        ordinal: child.ordinal,
        siblingCount: node.children.length,
      });
    });
  };

  if (root != null) place(root, { parentLocator: null, role: null, ordinal: 0, siblingCount: 1 });
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
  const fixed = new Set(
    bounds.filter((card) =>
      effectivePositions.has(
        'node' in card
          ? (card.node.relationId ?? card.node.locator)
          : CANVAS_RELATIONAL_OUTPUT_POSITION_ID
      )
    )
  );
  placeUnanchoredCanvasCards(bounds, fixed);
  return {
    expansionFrame: expanded?.frame,
    ...measureCanvasRelationalBounds(bounds),
    output,
    nodes,
    edges: projectCanonicalRelationEdges(nodes),
  };
}
