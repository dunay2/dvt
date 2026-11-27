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
const CONNECTED_CARD_GAP = 64;
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
  const outputPosition = effectivePositions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID);
  const output = {
    ...(outputPosition ?? { x: 320, y: 36 }),
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

  const place = (
    node: CanvasRelationalTreeNode,
    parent: Pick<
      CanvasRelationalTreePlacedNode,
      'parentLocator' | 'role' | 'ordinal' | 'siblingCount'
    >,
    downstreamX: number
  ): void => {
    const depth = depths.get(node.locator) ?? 0;
    const size = sizeFor(node);
    const position = effectivePositions.get(node.relationId ?? node.locator) ?? {
      x: Math.min(columnLeft[depth]!, downstreamX - size.width - CONNECTED_CARD_GAP),
      y: rows.get(node.locator)!,
    };
    nodes.push({
      node,
      ...position,
      ...size,
      level: rootDepth - depth + 1,
      ...parent,
    });

    node.children.forEach((child) => {
      place(
        child.node,
        {
          parentLocator: node.locator,
          role: child.role,
          ordinal: child.ordinal,
          siblingCount: node.children.length,
        },
        position.x
      );
    });
  };

  const rootParent = { parentLocator: null, role: null, ordinal: 0, siblingCount: 1 };
  if (root != null) place(root, rootParent, outputPosition?.x ?? Number.POSITIVE_INFINITY);
  const rootNode = nodes[0];
  if (rootNode != null) {
    output.inputLocator = rootNode.node.locator;
    if (outputPosition == null) {
      output.x = rootNode.x + rootNode.width + CONNECTED_CARD_GAP;
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
  const fixed = new Set<(typeof bounds)[number]>(
    nodes.filter(({ node }) => effectivePositions.has(node.relationId ?? node.locator))
  );
  if (outputPosition != null) fixed.add(output);
  placeUnanchoredCanvasCards(bounds, fixed);
  return {
    expansionFrame: expanded?.frame,
    ...measureCanvasRelationalBounds(bounds),
    output,
    nodes,
    edges: projectCanonicalRelationEdges(nodes),
  };
}
