/** Owned concern: share the resolved shell heading with passive route presentation, without title state. */
import { createContext, useContext, type ReactNode } from 'react';
import type { ShellRouteHeading } from '../../shell/shellNavigationModel';

const ShellRouteHeadingContext = createContext<ShellRouteHeading | null>(null);

export function ShellRouteHeadingProvider({
  heading,
  children,
}: Readonly<{ heading: ShellRouteHeading | null; children: ReactNode }>) {
  return (
    <ShellRouteHeadingContext.Provider value={heading}>
      {children}
    </ShellRouteHeadingContext.Provider>
  );
}

export function useShellRouteHeading(): ShellRouteHeading | null {
  return useContext(ShellRouteHeadingContext);
}
