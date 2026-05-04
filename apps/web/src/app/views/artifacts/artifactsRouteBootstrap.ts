/** Owned concern: publish Artifacts workbench posture into the route bootstrap contract. */
import {
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import type { ArtifactsWorkbenchState } from './artifactsWorkbenchStateModel';

export function deriveArtifactsRouteBootstrapPresentation(
  workbenchState: ArtifactsWorkbenchState
): RouteBootstrapPresentation {
  switch (workbenchState.kind) {
    case 'loading':
      return createPendingRouteBootstrapPresentation('Loading artifacts for the route');
    case 'error':
    case 'invalid-import':
      return createFailedRouteBootstrapPresentation(workbenchState.message);
    case 'empty':
      return createCompleteRouteBootstrapPresentation('Artifacts route is ready with no artifacts');
    case 'ready':
      return createCompleteRouteBootstrapPresentation('Artifacts route is ready');
  }
}
