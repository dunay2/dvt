import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import type { ArtifactsWorkbenchState } from './artifactsWorkbenchStateModel';

export const ARTIFACTS_ROUTE_ID = 'dbt.artifacts';

export const ARTIFACTS_ROUTE_BOOTSTRAP_HANDLE =
  createPublishedRouteBootstrapHandle({
    pendingDetail: 'Preparing Artifacts route',
  });

export function deriveArtifactsRouteBootstrapPresentation(
  workbenchState: ArtifactsWorkbenchState
): RouteBootstrapPresentation {
  switch (workbenchState.kind) {
    case 'loading':
      return createPendingRouteBootstrapPresentation(
        'Loading artifacts for the route'
      );
    case 'error':
    case 'invalid-import':
      return createErrorRouteBootstrapPresentation(workbenchState.message);
    case 'empty':
      return createCompleteRouteBootstrapPresentation(
        'Artifacts route is ready with no artifacts'
      );
    case 'ready':
      return createCompleteRouteBootstrapPresentation('Artifacts route is ready');
  }
}
