/** Owned concern: coordinate Code persistence before SPA or browser navigation. */
import { useEffect } from 'react';
import { useBlocker, useInRouterContext } from 'react-router';

type CodeWorkingTreeNavigationGuardProps = Readonly<{
  blocked: boolean;
  flush: () => Promise<boolean>;
}>;

function RouterNavigationGuard({ blocked, flush }: CodeWorkingTreeNavigationGuardProps): null {
  const blocker = useBlocker(blocked);

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return;
    }

    let active = true;
    void flush().then((persisted) => {
      if (!active || blocker.state !== 'blocked') {
        return;
      }
      if (persisted) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    });

    return () => {
      active = false;
    };
  }, [blocker, flush]);

  return null;
}

function OptionalRouterNavigationGuard(
  props: CodeWorkingTreeNavigationGuardProps
): React.JSX.Element | null {
  const isInRouter = useInRouterContext();
  return isInRouter ? <RouterNavigationGuard {...props} /> : null;
}

export function CodeWorkingTreeNavigationGuard({
  blocked,
  flush,
}: CodeWorkingTreeNavigationGuardProps): React.JSX.Element {
  useEffect(() => {
    if (!blocked) {
      return;
    }

    const preventUnpersistedExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', preventUnpersistedExit);
    return () => window.removeEventListener('beforeunload', preventUnpersistedExit);
  }, [blocked]);

  return <OptionalRouterNavigationGuard blocked={blocked} flush={flush} />;
}
