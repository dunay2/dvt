import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapPresentation';
import type { LineageWorkbenchState } from './lineageWorkbenchStateModel';

export const LINEAGE_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: 'Preparing Lineage route',
});

export function deriveLineageRouteBootstrapPresentation(
  workbenchState: LineageWorkbenchState
): RouteBootstrapPresentation {
  switch (workbenchState.kind) {
    case 'loading':
      return createPendingRouteBootstrapPresentation(
        'Loading lineage graph for the route'
      );
    case 'error':
      return createErrorRouteBootstrapPresentation(workbenchState.message);
    case 'empty':
      return createCompleteRouteBootstrapPresentation(
        'Lineage route is ready with no focus node'
      );
    case 'ready':
      return createCompleteRouteBootstrapPresentation('Lineage route is ready');
  }
}
