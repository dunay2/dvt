/** Owned concern: retain one placement lifetime and publish only settled layout. */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { areCanvasPositionsEqual } from '../../../types/canvasPositions';
import type { CardPosition, CanvasRelationalTreeLayout } from '../canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import type { CanvasRelationalTreeNodeSize } from '../canvasRelationalTreeGeometryMetrics';
import type { projectCanvasRelationalMovableCards } from '../projectCanvasRelationalMovableCards';
import {
  createRelationalPlacementCommands,
  createRelationalMovementCommands,
  type RelationalCardPlacementContext,
} from './relationalCardPlacementCommands';

type Positions = ReadonlyMap<string, CardPosition>;
type Extent = Pick<CanvasRelationalTreeLayout, 'width' | 'height'> | null;
type Expansion = CanvasRelationalTreeLayout['expansionFrame'] | null;
type Cards = Readonly<ReturnType<typeof projectCanvasRelationalMovableCards>>;
type ContentSize = RelationalCardPlacementContext['contentSize']['current'];
type Provisional = RelationalCardPlacementContext['provisional']['current'];
const EMPTY_POSITIONS: Positions = new Map();

export function useRelationalCardPlacement(
  initialPositions: Positions,
  onPositionsChange?: (positions: Positions) => void
) {
  const [positions, setPositions] = useState<Positions>(() => new Map(initialPositions));
  const positionsRef = useRef(positions);
  const displayedCards = useRef<Cards>([]);
  const expansionFrame = useRef<Expansion>(null);
  const contentSize = useRef<ContentSize>(null);
  const [extent, setExtent] = useState<Extent>(null);
  const autoFit = useRef(true);
  const provisional = useRef<Provisional>(null);
  const context = useMemo<RelationalCardPlacementContext>(
    () => ({
      positionsRef,
      displayedCards,
      expansionFrame,
      contentSize,
      provisional,
      autoFit,
      setPositions,
      setExtent,
    }),
    []
  );
  const placement = useMemo(() => createRelationalPlacementCommands(context), [context]);
  const movement = useMemo(
    () => createRelationalMovementCommands(context, onPositionsChange, EMPTY_POSITIONS),
    [context, onPositionsChange]
  );
  const projectLayout = useCallback(
    (
      root: CanvasRelationalTreeNode | null,
      sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>,
      detached: readonly CanvasRelationalTreeNode[]
    ) => placement.projectLayout(root, sizes, detached, { positions, extent }),
    [positions, extent, placement]
  );
  useLayoutEffect(() => {
    if (areCanvasPositionsEqual(initialPositions, positionsRef.current)) return;
    provisional.current = null;
    expansionFrame.current = null;
    setExtent(null);
    const next = new Map(initialPositions);
    positionsRef.current = next;
    setPositions(next);
  }, [initialPositions]);
  const previewPosition = useCallback(
    (id: string, position: CardPosition, visiblePositions: Positions) =>
      placement.previewPosition(id, position, visiblePositions, extent),
    [extent, placement]
  );
  return {
    positions,
    displayedCards,
    ...movement,
    projectLayout,
    contentSize,
    setExtent,
    previewPosition,
    autoFit,
  };
}
