/** Owned concern: share one discardable Add request between a Model toolbar and its canvas. */
import { createContext, useContext, useState, type ReactNode } from 'react';

type Point = Readonly<{ x: number; y: number }>;
export type CanvasRelationalOperationMenuRequest = Readonly<{
  screenPosition: Point;
  canvasPosition: Point;
  opener: HTMLElement;
}>;
type MenuState = Readonly<{
  admission: Readonly<{ enabled: boolean }>;
  open: boolean;
  request: CanvasRelationalOperationMenuRequest | null;
}>;
type MenuController = Pick<MenuState, 'open' | 'request'> &
  Readonly<{
    enabled: boolean;
    label: string;
    openAt: (request: CanvasRelationalOperationMenuRequest) => void;
    setOpen: (open: boolean) => void;
  }>;
const Context = createContext<MenuController | null>(null);

/** UI state is scoped to the Model lifetime; opening never stages or applies a command. */
export function CanvasRelationalOperationMenuProvider({
  enabled,
  label,
  children,
}: Readonly<{
  enabled: boolean;
  label: string;
  children: ReactNode;
}>): JSX.Element {
  const [state, setState] = useState<MenuState>({
    admission: { enabled },
    open: false,
    request: null,
  });
  // A changed admission starts a new lifetime before children render. The token
  // also rejects callbacks retained from an earlier enabled period (including ABA).
  if (state.admission.enabled !== enabled) {
    setState({ admission: { enabled }, open: false, request: null });
  }
  const admission = state.admission;
  return (
    <Context.Provider
      value={{
        ...state,
        enabled,
        label,
        openAt: (request) => {
          if (enabled)
            setState((current) =>
              current.admission === admission ? { ...current, open: true, request } : current
            );
        },
        setOpen: (open) =>
          setState((current) =>
            current.admission === admission
              ? { ...current, open, request: open ? null : current.request }
              : current
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useCanvasRelationalOperationMenu(): MenuController | null {
  return useContext(Context);
}
