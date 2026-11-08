/** Owned concern: place active route controls in the shell without owning their commands. */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type ActivityRailScope = Readonly<{
  target: HTMLDivElement | null;
  mount: (target: HTMLDivElement | null) => void;
  active: boolean;
}>;

const ActivityRailContext = createContext<ActivityRailScope | undefined>(undefined);

export function ShellActivityRailProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [target, mount] = useState<HTMLDivElement | null>(null);
  const scope = useMemo(() => ({ target, mount, active: true }), [target]);
  return <ActivityRailContext.Provider value={scope}>{children}</ActivityRailContext.Provider>;
}

export function ShellActivityRailHost() {
  const scope = useContext(ActivityRailContext);
  return <div ref={scope?.mount} data-slot="canvas-activity-rail-host" />;
}

export function ShellActivityRailScope({
  active,
  children,
}: Readonly<{ active: boolean; children: ReactNode }>) {
  const parent = useContext(ActivityRailContext);
  const scope = useMemo(
    () => (parent === undefined ? undefined : { ...parent, active: parent.active && active }),
    [parent, active]
  );
  return <ActivityRailContext.Provider value={scope}>{children}</ActivityRailContext.Provider>;
}

export function useShellActivityRail():
  Readonly<Pick<ActivityRailScope, 'target' | 'active'>> | undefined {
  // No provider is standalone mode; a present provider with no target must stay hidden.
  return useContext(ActivityRailContext);
}
