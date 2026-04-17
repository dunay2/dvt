import type {
  RouteBootstrapHandle,
  RouteBootstrapPresentation,
} from './routeBootstrapContract';

export type AppRouteHandle = {
  routeBootstrap?: RouteBootstrapHandle;
};

export type RouteBootstrapRegistration = {
  routeId: string;
  routeBootstrap: RouteBootstrapHandle;
};

function isValidRouteBootstrapPresentation(
  value: unknown
): value is RouteBootstrapPresentation {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<RouteBootstrapPresentation>;
  return (
    (candidate.status === 'pending' ||
      candidate.status === 'complete' ||
      candidate.status === 'blocked' ||
      candidate.status === 'error') &&
    typeof candidate.detail === 'string' &&
    typeof candidate.canComplete === 'boolean'
  );
}

export function getRouteBootstrapRegistration(
  routeId: string | null | undefined,
  handle: unknown
): RouteBootstrapRegistration | null {
  if (!routeId || typeof routeId !== 'string') {
    return null;
  }

  if (!handle || typeof handle !== 'object') {
    return null;
  }

  const routeBootstrap = (handle as AppRouteHandle).routeBootstrap;
  if (!routeBootstrap || typeof routeBootstrap !== 'object') {
    return null;
  }

  if (
    routeBootstrap.mode !== 'published' &&
    routeBootstrap.mode !== 'static'
  ) {
    return null;
  }

  if (!isValidRouteBootstrapPresentation(routeBootstrap.initialPresentation)) {
    return null;
  }

  if (
    routeBootstrap.mode === 'static' &&
    !isValidRouteBootstrapPresentation(routeBootstrap.settledPresentation)
  ) {
    return null;
  }

  return {
    routeId,
    routeBootstrap,
  };
}

export function getStaticRouteSettledPresentation(
  registration: RouteBootstrapRegistration
): RouteBootstrapPresentation | null {
  return registration.routeBootstrap.mode === 'static'
    ? registration.routeBootstrap.settledPresentation
    : null;
}
