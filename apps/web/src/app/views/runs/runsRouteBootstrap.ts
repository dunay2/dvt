import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import type { RunsWorkbenchState } from './runWorkbenchStateModel';

export const RUNS_ROUTE_ID = 'monitoring.runs';
export const RUN_DETAIL_ROUTE_ID = 'monitoring.run-detail';

export const RUNS_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: 'Preparing Runs route',
});

export const RUN_DETAIL_ROUTE_BOOTSTRAP_HANDLE =
  createPublishedRouteBootstrapHandle({
    pendingDetail: 'Preparing Run detail route',
  });

export function deriveRunsRouteBootstrapPresentation(
  workbenchState: RunsWorkbenchState
): RouteBootstrapPresentation {
  switch (workbenchState.kind) {
    case 'runs-error':
    case 'run-error':
      return createErrorRouteBootstrapPresentation(workbenchState.message);
    case 'run-loading':
      return createPendingRouteBootstrapPresentation(
        `Loading run ${workbenchState.runId}`
      );
    case 'runs-list':
      return workbenchState.isLoading && workbenchState.runs.length === 0
        ? createPendingRouteBootstrapPresentation('Loading runs for the route')
        : createCompleteRouteBootstrapPresentation('Runs route is ready');
    case 'runs-empty':
      return createCompleteRouteBootstrapPresentation(
        'Runs route is ready with no runs'
      );
    case 'run-missing':
      return createCompleteRouteBootstrapPresentation(
        `Run ${workbenchState.runId} was not found`
      );
    case 'run-workspace':
      return createCompleteRouteBootstrapPresentation('Run detail route is ready');
  }
}
