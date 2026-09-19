/** Owned concern: route navigation attempts to the Model's explicit draft decision. */
import { useEffect, type RefObject } from 'react';
import { useBlocker, useInRouterContext } from 'react-router';
import type { CanvasRelationalTreeWorkbenchHandle } from './CanvasRelationalTreeWorkbench';

export type CanvasModelBlockedNavigation = Readonly<{ proceed: () => void; reset: () => void }>;
type GuardProps = Readonly<{
  workbench: RefObject<CanvasRelationalTreeWorkbenchHandle>;
  onBlocked: (navigation: CanvasModelBlockedNavigation) => void;
}>;

function RouterGuard({ workbench, onBlocked }: GuardProps): null {
  const blocker = useBlocker(() => workbench.current?.hasUnappliedChanges === true);
  useEffect(() => {
    if (blocker.state === 'blocked') onBlocked({ proceed: blocker.proceed, reset: blocker.reset });
  }, [blocker, onBlocked]);
  return null;
}

export function CanvasModelNavigationGuard(props: GuardProps): JSX.Element | null {
  return useInRouterContext() ? <RouterGuard {...props} /> : null;
}
