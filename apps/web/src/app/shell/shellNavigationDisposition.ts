/** Owned concern: decide shell navigation chrome posture for route families without rendering UI. */
export type ShellNavigationRailMode = 'visible' | 'hidden';

export type ShellNavigationFooterMode = 'pinned' | 'menu';

export type ShellNavigationDispositionReason = 'global_route' | 'workbench_route';

export type ShellNavigationDisposition = {
  readonly railMode: ShellNavigationRailMode;
  readonly footerMode: ShellNavigationFooterMode;
  readonly reason: ShellNavigationDispositionReason;
};

const WORKBENCH_ROUTE_PREFIXES = ['/canvas'] as const;

export function isWorkbenchRoute(pathname: string): boolean {
  return WORKBENCH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolveShellNavigationDisposition(pathname: string): ShellNavigationDisposition {
  if (isWorkbenchRoute(pathname)) {
    return {
      railMode: 'hidden',
      footerMode: 'menu',
      reason: 'workbench_route',
    };
  }

  return {
    railMode: 'visible',
    footerMode: 'pinned',
    reason: 'global_route',
  };
}
