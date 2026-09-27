/** Owned concern: discardable layout and disclosure shared by inspection and editing. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CardPosition } from '../canvasRelationalTreeGeometry';
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
  useEffect(() => {
    if (initialPositions === positionsRef.current) return;
    const next = new Map(initialPositions);
    positionsRef.current = next;
    setPositions(next);
  }, [initialPositions]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const setPosition = useCallback(
    (id: string, position: CardPosition) => {
      const next = new Map(positionsRef.current).set(id, position);
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
    const next = new Map<string, CardPosition>();
    positionsRef.current = next;
    setPositions(next);
    onPositionsChange?.(next);
  }, [onPositionsChange]);
  return useMemo(
    () => ({
      positions,
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
    [positions, setPosition, expanded, toggleDetail, arrange, zoom, minimumZoom]
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
