/** Owned concern: publish Cost workbench loading and failure posture into the route bootstrap contract. */
import {
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';

export const COST_ROUTE_ID = 'cost.dashboard';

export function deriveCostRouteBootstrapPresentation({
  isLoading,
  errorMessage,
}: {
  isLoading: boolean;
  errorMessage: string | null;
}): RouteBootstrapPresentation {
  if (isLoading) {
    return createPendingRouteBootstrapPresentation('Loading cost coverage for the route');
  }

  if (errorMessage) {
    return createFailedRouteBootstrapPresentation(errorMessage);
  }

  return createCompleteRouteBootstrapPresentation('Cost route is ready');
}
