/** Owned concern: publish Lineage workbench posture into the route bootstrap contract. */
import {
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import type { LineageWorkbenchState } from './lineageWorkbenchStateModel';

export function deriveLineageRouteBootstrapPresentation(
  workbenchState: LineageWorkbenchState
): RouteBootstrapPresentation {
  switch (workbenchState.kind) {
    case 'loading':
      return createPendingRouteBootstrapPresentation('Loading lineage graph for the route');
    case 'error':
      return createFailedRouteBootstrapPresentation(workbenchState.message);
    case 'empty':
      return createCompleteRouteBootstrapPresentation('Lineage route is ready with no focus node');
    case 'ready':
      return createCompleteRouteBootstrapPresentation('Lineage route is ready');
  }
}
