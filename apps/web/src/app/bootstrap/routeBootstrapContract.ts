/** Owned concern: define route bootstrap handles and helper factories over canonical startup readiness. */
import type { BootstrapStepState } from './appBootstrapPresentation';

export type RouteBootstrapPresentation = BootstrapStepState;

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

export function createPendingRouteBootstrapPresentation(
  detail: string
): RouteBootstrapPresentation {
  return {
    status: 'pending',
    detail,
  };
}

export function createCompleteRouteBootstrapPresentation(
  detail: string
): RouteBootstrapPresentation {
  return {
    status: 'complete',
    detail,
  };
}

export function createBlockedRouteBootstrapPresentation(
  detail: string
): RouteBootstrapPresentation {
  return {
    status: 'blocked',
    detail,
  };
}

export function createFailedRouteBootstrapPresentation(detail: string): RouteBootstrapPresentation {
  return {
    status: 'failed',
    detail,
  };
}

export function createErrorRouteBootstrapPresentation(detail: string): RouteBootstrapPresentation {
  return {
    status: 'error',
    detail,
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
