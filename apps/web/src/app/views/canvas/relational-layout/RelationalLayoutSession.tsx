/** Owned concern: discardable layout and disclosure shared by inspection and editing. */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CardPosition } from '../canvasRelationalTreeGeometry';
import { CANVAS_RELATIONAL_TREE_MIN_ZOOM } from '../canvasRelationalTreeViewport';
function useLayout() {
  const autoFit = useRef(true);
  const scroll = useRef({ left: 0, top: 0 });
  const [zoom, setZoom] = useState(1);
  const [minimumZoom, setMinimumZoom] = useState(CANVAS_RELATIONAL_TREE_MIN_ZOOM);
  const [positions, setPositions] = useState<ReadonlyMap<string, CardPosition>>(() => new Map());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const setPosition = useCallback((id: string, position: CardPosition) => {
    setPositions((current) => new Map(current).set(id, position));
  }, []);
  const toggleDetail = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const arrange = useCallback(() => setPositions(new Map()), []);
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

export function RelationalLayoutSession({ children }: Readonly<{ children: ReactNode }>) {
  const parent = useContext(LayoutContext);
  return parent == null ? <OwnedLayoutSession>{children}</OwnedLayoutSession> : <>{children}</>;
}

function OwnedLayoutSession({ children }: Readonly<{ children: ReactNode }>) {
  const value = useLayout();
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useRelationalLayout() {
  const session = useContext(LayoutContext);
  if (session == null) throw new Error('Relational layout requires a layout session.');
  return session;
}
