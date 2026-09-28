/** Owned concern: discardable layout and disclosure shared by inspection and editing. */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  layoutCanvasRelationalTree,
  type CardPosition,
  type CanvasRelationalTreeLayout,
} from '../canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import type { CanvasRelationalTreeNodeSize } from '../canvasRelationalTreeGeometryMetrics';
import { CANVAS_RELATIONAL_TREE_MIN_ZOOM } from '../canvasRelationalTreeViewport';
const EMPTY_POSITIONS: ReadonlyMap<string, CardPosition> = new Map();
function useLayout(
  initialPositions: ReadonlyMap<string, CardPosition>,
  onPositionsChange?: (positions: ReadonlyMap<string, CardPosition>) => void
) {
  const autoFit = useRef(true);
  const scroll = useRef({ left: 0, top: 0 });
  const [zoom, setZoom] = useState(1);
  const [minimumZoom, setMinimumZoom] = useState(CANVAS_RELATIONAL_TREE_MIN_ZOOM);
  const [positions, setPositions] = useState<ReadonlyMap<string, CardPosition>>(
    () => new Map(initialPositions)
  );
  const positionsRef = useRef(positions);
  const expansionFrame = useRef<CanvasRelationalTreeLayout['expansionFrame'] | null>(null);
  const contentSize = useRef<Pick<CanvasRelationalTreeLayout, 'width' | 'height'> | null>(null);
  const [extent, setExtent] = useState<Pick<CanvasRelationalTreeLayout, 'width' | 'height'> | null>(
    null
  );
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
    expansionFrame.current = null;
    setExtent(null);
    const next = new Map(initialPositions);
    positionsRef.current = next;
    setPositions(next);
  }, [initialPositions]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const setPosition = useCallback(
    (id: string, position: CardPosition, visiblePositions = EMPTY_POSITIONS) => {
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
      onPositionsChange?.(next);
    },
    [onPositionsChange]
  );
  const toggleDetail = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const arrange = useCallback(() => {
    expansionFrame.current = null;
    setExtent(null);
    const next = new Map<string, CardPosition>();
    positionsRef.current = next;
    setPositions(next);
    onPositionsChange?.(next);
  }, [onPositionsChange]);
  return useMemo(
    () => ({
      positions,
      projectLayout,
      contentSize,
      setExtent,
      setPosition,
      expanded,
      toggleDetail,
      arrange,
      autoFit,
      scroll,
      zoom,
      setZoom,
      minimumZoom,
      setMinimumZoom,
    }),
    [positions, projectLayout, setPosition, expanded, toggleDetail, arrange, zoom, minimumZoom]
  );
}
const LayoutContext = createContext<ReturnType<typeof useLayout> | null>(null);

export function RelationalLayoutSession({
  children,
  isolated = false,
  initialPositions = EMPTY_POSITIONS,
  onPositionsChange,
}: Readonly<{
  children: ReactNode;
  isolated?: boolean;
  initialPositions?: ReadonlyMap<string, CardPosition>;
  onPositionsChange?: (positions: ReadonlyMap<string, CardPosition>) => void;
}>) {
  const parent = useContext(LayoutContext);
  return parent == null || isolated ? (
    <OwnedLayoutSession initialPositions={initialPositions} onPositionsChange={onPositionsChange}>
      {children}
    </OwnedLayoutSession>
  ) : (
    <>{children}</>
  );
}

function OwnedLayoutSession({
  children,
  initialPositions,
  onPositionsChange,
}: Readonly<{
  children: ReactNode;
  initialPositions: ReadonlyMap<string, CardPosition>;
  onPositionsChange?: (positions: ReadonlyMap<string, CardPosition>) => void;
}>) {
  const value = useLayout(initialPositions, onPositionsChange);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useRelationalLayout() {
  const session = useContext(LayoutContext);
  if (session == null) throw new Error('Relational layout requires a layout session.');
  return session;
}
