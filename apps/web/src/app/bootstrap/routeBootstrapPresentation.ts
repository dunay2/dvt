export type RouteBootstrapStatus = 'pending' | 'complete' | 'blocked' | 'error';

export type RouteBootstrapPresentation = {
  status: RouteBootstrapStatus;
  detail: string;
  canComplete: boolean;
};

export type RouteBootstrapHandle =
  | {
      mode: 'published';
      initialPresentation: RouteBootstrapPresentation;
    }
  | {
      mode: 'static';
      initialPresentation: RouteBootstrapPresentation;
      settledPresentation: RouteBootstrapPresentation;
    };

export type AppRouteHandle = {
  routeBootstrap?: RouteBootstrapHandle;
};

export type RouteBootstrapRegistration = {
  routeId: string;
  routeBootstrap: RouteBootstrapHandle;
};

const MISSING_ROUTE_BOOTSTRAP_PRESENTATION: RouteBootstrapPresentation = {
  status: 'pending',
  detail: 'Active route bootstrap contract is missing',
  canComplete: false,
};

const routeBootstrapPresentations = new Map<string, RouteBootstrapPresentation>();
const listeners = new Set<() => void>();

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

function areRouteBootstrapPresentationsEqual(
  left: RouteBootstrapPresentation,
  right: RouteBootstrapPresentation
): boolean {
  return (
    left.status === right.status &&
    left.detail === right.detail &&
    left.canComplete === right.canComplete
  );
}

function emitRouteBootstrapChange(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

export function createPendingRouteBootstrapPresentation(
  detail: string
): RouteBootstrapPresentation {
  return {
    status: 'pending',
    detail,
    canComplete: false,
  };
}

export function createCompleteRouteBootstrapPresentation(
  detail: string
): RouteBootstrapPresentation {
  return {
    status: 'complete',
    detail,
    canComplete: true,
  };
}

export function createBlockedRouteBootstrapPresentation(
  detail: string
): RouteBootstrapPresentation {
  return {
    status: 'blocked',
    detail,
    canComplete: false,
  };
}

export function createErrorRouteBootstrapPresentation(
  detail: string
): RouteBootstrapPresentation {
  return {
    status: 'error',
    detail,
    canComplete: false,
  };
}

export function createPublishedRouteBootstrapHandle({
  pendingDetail,
}: {
  pendingDetail: string;
}): RouteBootstrapHandle {
  return {
    mode: 'published',
    initialPresentation: createPendingRouteBootstrapPresentation(pendingDetail),
  };
}

export function createStaticRouteBootstrapHandle({
  pendingDetail,
  readyDetail,
}: {
  pendingDetail: string;
  readyDetail: string;
}): RouteBootstrapHandle {
  return {
    mode: 'static',
    initialPresentation: createPendingRouteBootstrapPresentation(pendingDetail),
    settledPresentation: createCompleteRouteBootstrapPresentation(readyDetail),
  };
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

export function getPublishedRouteBootstrapPresentation(
  registration: RouteBootstrapRegistration | null | undefined
): RouteBootstrapPresentation {
  if (!registration) {
    return MISSING_ROUTE_BOOTSTRAP_PRESENTATION;
  }

  return (
    routeBootstrapPresentations.get(registration.routeId) ??
    registration.routeBootstrap.initialPresentation
  );
}

export function getStaticRouteSettledPresentation(
  registration: RouteBootstrapRegistration
): RouteBootstrapPresentation | null {
  return registration.routeBootstrap.mode === 'static'
    ? registration.routeBootstrap.settledPresentation
    : null;
}

export function publishRouteBootstrapPresentation(
  registration: RouteBootstrapRegistration,
  nextPresentation: RouteBootstrapPresentation
): void {
  const currentPresentation = getPublishedRouteBootstrapPresentation(registration);
  if (areRouteBootstrapPresentationsEqual(currentPresentation, nextPresentation)) {
    return;
  }

  routeBootstrapPresentations.set(registration.routeId, nextPresentation);
  emitRouteBootstrapChange();
}

export function resetRouteBootstrapPresentation(
  registration: RouteBootstrapRegistration
): void {
  if (!routeBootstrapPresentations.delete(registration.routeId)) {
    return;
  }

  emitRouteBootstrapChange();
}

export function subscribeRouteBootstrapPresentations(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
