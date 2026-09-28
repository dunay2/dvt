/** Reserve lexical-detail space without modifying authored compact positions. */
import type { CanvasRelationalTreeLayout } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeNodeSize } from './canvasRelationalTreeGeometryMetrics';

type CardBounds = CanvasRelationalTreeNodeSize & { id: string; x: number; y: number };

function reserveCardSpace(
  cards: readonly CardBounds[],
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>
) {
  const positions = new Map(cards.map((card) => [card.id, { x: card.x, y: card.y }]));
  for (const [axis, dimension] of [
    ['x', 'width'],
    ['y', 'height'],
  ] as const) {
    const ordered = [...cards].sort((a, b) => a[axis] - b[axis]);
    for (const [index, card] of ordered.entries()) {
      const position = positions.get(card.id)!;
      for (const preceding of ordered.slice(0, index)) {
        const gap = card[axis] - preceding[axis] - preceding[dimension];
        if (gap < 0) continue;
        const size = sizes.get(preceding.id)?.[dimension] ?? preceding[dimension];
        position[axis] = Math.max(position[axis], positions.get(preceding.id)![axis] + size + gap);
      }
    }
  }
  return positions;
}

export function projectCanvasRelationalCardExpansion(
  compact: CanvasRelationalTreeLayout,
  sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>,
  outputId: string,
  previous?: CanvasRelationalTreeLayout['expansionFrame'] | null
) {
  const cards: CardBounds[] = compact.nodes.map((placed) => ({
    id: placed.node.relationId ?? placed.node.locator,
    x: placed.x,
    y: placed.y,
    width: placed.width,
    height: placed.height,
  }));
  if (compact.output != null) cards.push({ ...compact.output, id: outputId });
  const expandedSizes = new Map(
    compact.nodes.map((placed) => [
      placed.node.relationId ?? placed.node.locator,
      sizes.get(placed.node.locator) ?? placed,
    ])
  );
  const key = JSON.stringify(
    compact.nodes.map((placed) => [
      placed.node.relationId,
      placed.node.locator,
      placed.parentLocator,
      placed.role,
      placed.ordinal,
      expandedSizes.get(placed.node.relationId ?? placed.node.locator)?.width,
      expandedSizes.get(placed.node.relationId ?? placed.node.locator)?.height,
    ])
  );
  const reserved = previous?.key === key ? null : reserveCardSpace(cards, expandedSizes);
  const offsets =
    reserved == null
      ? previous!.offsets
      : new Map(
          cards.map((card) => {
            const expanded = reserved.get(card.id)!;
            return [card.id, { x: expanded.x - card.x, y: expanded.y - card.y }];
          })
        );
  const positions = new Map(
    cards.map((card) => {
      const offset = offsets.get(card.id)!;
      return [card.id, { x: card.x + offset.x, y: card.y + offset.y }];
    })
  );
  return { positions, frame: { key, offsets } };
}
