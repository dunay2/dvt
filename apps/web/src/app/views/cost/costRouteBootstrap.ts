import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapPresentation';

export const COST_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: 'Preparing Cost route',
});

export function deriveCostRouteBootstrapPresentation({
  isLoading,
  errorMessage,
}: {
  isLoading: boolean;
  errorMessage: string | null;
}): RouteBootstrapPresentation {
  if (isLoading) {
    return createPendingRouteBootstrapPresentation(
      'Loading cost coverage for the route'
    );
  }

  if (errorMessage) {
    return createErrorRouteBootstrapPresentation(errorMessage);
  }

  return createCompleteRouteBootstrapPresentation('Cost route is ready');
}
