/** Owned concern: discardable layout and disclosure shared by inspection and editing. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CardPosition } from '../canvasRelationalTreeGeometry';
function useLayout() {
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
    () => ({ positions, setPosition, expanded, toggleDetail, arrange }),
    [positions, setPosition, expanded, toggleDetail, arrange]
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
