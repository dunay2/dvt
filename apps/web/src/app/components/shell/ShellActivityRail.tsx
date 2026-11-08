/** Identify shell-owned navigation so standalone Explorer can retain its local controls. */
import { createContext, useContext, type ReactNode } from 'react';

const ActivityRailContext = createContext(false);

export function ShellActivityRailProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <ActivityRailContext.Provider value={true}>{children}</ActivityRailContext.Provider>;
}

export function useShellActivityRail(): boolean {
  return useContext(ActivityRailContext);
}
