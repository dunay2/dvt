/** Owned concern: discardable positions shared by the inspection and editing views. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CardPosition } from '../canvasRelationalTreeGeometry';
function usePositions() {
  const [positions, setPositions] = useState<ReadonlyMap<string, CardPosition>>(() => new Map());
  const setPosition = useCallback((id: string, position: CardPosition) => {
    setPositions((current) => new Map(current).set(id, position));
  }, []);
  return useMemo(() => ({ positions, setPosition }), [positions, setPosition]);
}
const LayoutContext = createContext<ReturnType<typeof usePositions> | null>(null);

export function RelationalLayoutSession({ children }: Readonly<{ children: ReactNode }>) {
  const value = usePositions();
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

/** Standalone tree views own their positions; a Model session shares them across views. */
export function useRelationalCardPositions() {
  const session = useContext(LayoutContext);
  const standalone = usePositions();
  return session ?? standalone;
}
