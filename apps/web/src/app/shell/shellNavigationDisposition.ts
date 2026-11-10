/** Owned concern: decide shell navigation chrome posture for route families without rendering UI. */
export type ShellNavigationDispositionReason = 'global_route' | 'workbench_route';

export type ShellNavigationDisposition = {
  readonly reason: ShellNavigationDispositionReason;
};

const WORKBENCH_ROUTE_PREFIXES = ['/canvas', '/runs', '/templates', '/plugins', '/admin'] as const;

export function isCanvasRoute(pathname: string): boolean {
  return pathname === '/canvas' || pathname.startsWith('/canvas/');
}

export function isWorkbenchRoute(pathname: string): boolean {
  return WORKBENCH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolveShellNavigationDisposition(pathname: string): ShellNavigationDisposition {
  if (isWorkbenchRoute(pathname)) {
    return {
      reason: 'workbench_route',
    };
  }

  return {
    reason: 'global_route',
  };
}
