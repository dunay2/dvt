/** Owned concern: project provisional card coordinates and publish only settled layout. */
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  layoutCanvasRelationalTree,
  type CardPosition,
  type CanvasRelationalTreeLayout,
} from '../canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import type { CanvasRelationalTreeNodeSize } from '../canvasRelationalTreeGeometryMetrics';

type Positions = ReadonlyMap<string, CardPosition>;
type Extent = Pick<CanvasRelationalTreeLayout, 'width' | 'height'> | null;
type Expansion = CanvasRelationalTreeLayout['expansionFrame'] | null;
const EMPTY_POSITIONS: Positions = new Map();

export function useRelationalCardPlacement(
  initialPositions: Positions,
  onPositionsChange?: (positions: Positions) => void
) {
  const [positions, setPositions] = useState<Positions>(() => new Map(initialPositions));
  const positionsRef = useRef(positions);
  const expansionFrame = useRef<Expansion>(null);
  const contentSize = useRef<Extent>(null);
  const [extent, setExtent] = useState<Extent>(null);
  const autoFit = useRef(true);
  const provisional = useRef<{
    id: string;
    positions: Positions;
    expansion: Expansion;
    extent: Extent;
    autoFit: boolean;
  } | null>(null);
  const projectLayout = useCallback(
    (
      root: CanvasRelationalTreeNode | null,
      sizes: ReadonlyMap<string, CanvasRelationalTreeNodeSize>,
      detached: readonly CanvasRelationalTreeNode[]
    ) => {
      const next = layoutCanvasRelationalTree(
        root,
        sizes,
        positions,
        detached,
        expansionFrame.current
      );
      expansionFrame.current = next.expansionFrame ?? null;
      contentSize.current = { width: next.width, height: next.height };
      return {
        ...next,
        width: Math.max(next.width, extent?.width ?? 0),
        height: Math.max(next.height, extent?.height ?? 0),
      };
    },
    [positions, extent]
  );
  useLayoutEffect(() => {
    if (initialPositions === positionsRef.current) return;
    provisional.current = null;
    expansionFrame.current = null;
    setExtent(null);
    const next = new Map(initialPositions);
    positionsRef.current = next;
    setPositions(next);
  }, [initialPositions]);

  const place = useCallback((id: string, position: CardPosition, visiblePositions: Positions) => {
    const before = contentSize.current;
    if (before != null) {
      setExtent((current) =>
        current != null && current.width >= before.width && current.height >= before.height
          ? current
          : {
              width: Math.max(current?.width ?? 0, before.width),
              height: Math.max(current?.height ?? 0, before.height),
            }
      );
    }
    const next = new Map([...visiblePositions, ...positionsRef.current]).set(id, position);
    positionsRef.current = next;
    setPositions(next);
    return next;
  }, []);
  const previewPosition = useCallback(
    (id: string, position: CardPosition, visiblePositions: Positions) => {
      provisional.current ??= {
        id,
        positions: positionsRef.current,
        expansion: expansionFrame.current,
        extent,
        autoFit: autoFit.current,
      };
      place(id, position, visiblePositions);
    },
    [extent, place]
  );
  const finishMovement = useCallback(
    (cancel: boolean) => {
      const before = provisional.current;
      if (before == null) return;
      provisional.current = null;
      if (cancel) {
        positionsRef.current = before.positions;
        expansionFrame.current = before.expansion;
        autoFit.current = before.autoFit;
        setExtent(before.extent);
        setPositions(before.positions);
      } else {
        const next = new Map(before.positions).set(before.id, positionsRef.current.get(before.id)!);
        positionsRef.current = next;
        setPositions(next);
        onPositionsChange?.(next);
      }
    },
    [onPositionsChange]
  );
  const setPosition = useCallback(
    (id: string, position: CardPosition) => {
      const next = place(id, position, EMPTY_POSITIONS);
      onPositionsChange?.(next);
    },
    [onPositionsChange, place]
  );
  const arrange = useCallback(() => {
    provisional.current = null;
    expansionFrame.current = null;
    setExtent(null);
    const next = new Map<string, CardPosition>();
    positionsRef.current = next;
    setPositions(next);
    onPositionsChange?.(next);
  }, [onPositionsChange]);

  return {
    positions,
    projectLayout,
    contentSize,
    setExtent,
    setPosition,
    previewPosition,
    finishMovement,
    arrange,
    autoFit,
  };
}
