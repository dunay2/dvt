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
