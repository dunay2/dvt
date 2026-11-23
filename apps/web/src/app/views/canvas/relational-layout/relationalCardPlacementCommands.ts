/** Operate on the placement hook's cells; own no second state, effect or subscription. */
import { areCanvasPositionsEqual } from '../../../types/canvasPositions';
import {
  layoutCanvasRelationalTree,
  type CardPosition,
  type CanvasRelationalTreeLayout,
} from '../canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import type { CanvasRelationalTreeNodeSize } from '../canvasRelationalTreeGeometryMetrics';
import type { projectCanvasRelationalMovableCards } from '../projectCanvasRelationalMovableCards';

type Positions = ReadonlyMap<string, CardPosition>;
type Extent = Pick<CanvasRelationalTreeLayout, 'width' | 'height'> | null;
type Expansion = CanvasRelationalTreeLayout['expansionFrame'] | null;
type Cell<T> = { current: T };
type PositionListener = ((positions: Positions) => void) | undefined;

export type RelationalCardPlacementContext = Readonly<{
  positionsRef: Cell<Positions>;
  displayedCards: Cell<Readonly<ReturnType<typeof projectCanvasRelationalMovableCards>>>;
  expansionFrame: Cell<Expansion>;
  contentSize: Cell<Pick<CanvasRelationalTreeLayout, 'origin' | 'width' | 'height'> | null>;
  provisional: Cell<{
    id: string;
    positions: Positions;
    expansion: Expansion;
    extent: Extent;
    autoFit: boolean;
  } | null>;
  autoFit: Cell<boolean>;
  setPositions: (positions: Positions) => void;
  setExtent: (extent: Extent | ((current: Extent) => Extent)) => void;
}>;

export function createRelationalPlacementCommands(context: RelationalCardPlacementContext) {
  return {
    projectLayout(
      root: CanvasRelationalTreeNode | null,
      sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>,
      detached: readonly CanvasRelationalTreeNode[],
      snapshot: Readonly<{ positions: Positions; extent: Extent }>
    ) {
      const next = layoutCanvasRelationalTree(
        root,
        sizes,
        snapshot.positions,
        detached,
        context.expansionFrame.current
      );
      context.expansionFrame.current = next.expansionFrame ?? null;
      context.contentSize.current = { origin: next.origin, width: next.width, height: next.height };
      const minimum = snapshot.extent ?? { width: 0, height: 0 };
      return {
        ...next,
        width: Math.max(next.width, minimum.width),
        height: Math.max(next.height, minimum.height),
      };
    },
    previewPosition(
      id: string,
      position: CardPosition,
      visiblePositions: Positions,
      extent: Extent
    ) {
      context.provisional.current ??= {
        id,
        positions: context.positionsRef.current,
        expansion: context.expansionFrame.current,
        extent,
        autoFit: context.autoFit.current,
      };
      placeRelationalCard(context, id, position, visiblePositions);
    },
  };
}

export function createRelationalMovementCommands(
  context: RelationalCardPlacementContext,
  onPositionsChange: PositionListener,
  emptyPositions: Positions
) {
  return {
    finishMovement: (cancel: boolean) =>
      finishRelationalMovement(context, cancel, onPositionsChange),
    setPosition(id: string, position: CardPosition) {
      const next = placeRelationalCard(context, id, position, emptyPositions);
      onPositionsChange?.(next);
    },
    retainPositionsAfterRemoval: (id: string) =>
      retainRelationalPositions(context, id, onPositionsChange),
    arrange: () => arrangeRelationalCards(context, onPositionsChange),
  };
}

function placeRelationalCard(
  context: RelationalCardPlacementContext,
  id: string,
  position: CardPosition,
  visiblePositions: Positions
): Positions {
  const before = context.contentSize.current;
  if (before != null) context.setExtent((current) => extendRelationalExtent(current, before));
  const next = new Map([...visiblePositions, ...context.positionsRef.current]).set(id, position);
  context.positionsRef.current = next;
  context.setPositions(next);
  return next;
}

function extendRelationalExtent(
  current: Extent,
  before: NonNullable<RelationalCardPlacementContext['contentSize']['current']>
): Extent {
  if (current == null)
    return { width: Math.max(0, before.width), height: Math.max(0, before.height) };
  const width = Math.max(current.width, before.width);
  const height = Math.max(current.height, before.height);
  if (width === current.width && height === current.height) return current;
  return { width, height };
}

function finishRelationalMovement(
  context: RelationalCardPlacementContext,
  cancel: boolean,
  onPositionsChange: PositionListener
): void {
  const before = context.provisional.current;
  if (before == null) return;
  context.provisional.current = null;
  if (cancel) {
    context.positionsRef.current = before.positions;
    context.expansionFrame.current = before.expansion;
    context.autoFit.current = before.autoFit;
    context.setExtent(before.extent);
    context.setPositions(before.positions);
  } else {
    const next = new Map(before.positions).set(
      before.id,
      context.positionsRef.current.get(before.id)!
    );
    publishRelationalPositions(context, next, onPositionsChange);
  }
}

function retainRelationalPositions(
  context: RelationalCardPlacementContext,
  removedId: string,
  onPositionsChange: PositionListener
): void {
  const settled = context.provisional.current?.positions ?? context.positionsRef.current;
  const excluded = new Set([removedId, context.provisional.current?.id]);
  const next = new Map(settled);
  for (const { id, x, y, offset } of context.displayedCards.current) {
    if (excluded.has(id)) continue;
    const origin = offset ?? { x: 0, y: 0 };
    next.set(id, { x: x - origin.x, y: y - origin.y });
  }
  context.provisional.current = null;
  context.autoFit.current = false;
  if (areCanvasPositionsEqual(next, context.positionsRef.current)) return;
  publishRelationalPositions(context, next, onPositionsChange);
}

function arrangeRelationalCards(
  context: RelationalCardPlacementContext,
  onPositionsChange: PositionListener
): void {
  context.provisional.current = null;
  context.expansionFrame.current = null;
  context.setExtent(null);
  publishRelationalPositions(context, new Map<string, CardPosition>(), onPositionsChange);
}

function publishRelationalPositions(
  context: RelationalCardPlacementContext,
  next: Positions,
  onPositionsChange: PositionListener
): void {
  context.positionsRef.current = next;
  context.setPositions(next);
  onPositionsChange?.(next);
}
