/** Owned concern: publish Runs list and run-detail posture into the route bootstrap contract. */
import {
  createCompleteRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import type { RunsWorkbenchState } from './runWorkbenchStateModel';
import {
  getApplicationLanguage,
  type ApplicationLanguage,
} from '../../stores/applicationLanguageStore';
import { resolveRunStatesCopy } from './runStatesCopy';

export const RUNS_ROUTE_ID = 'monitoring.runs';
export const RUN_DETAIL_ROUTE_ID = 'monitoring.run-detail';

export const RUNS_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: resolveRunStatesCopy(getApplicationLanguage()).routePreparingRuns,
});

export const RUN_DETAIL_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: resolveRunStatesCopy(getApplicationLanguage()).routePreparingRunDetail,
});

export function deriveRunsRouteBootstrapPresentation(
  workbenchState: RunsWorkbenchState,
  language: ApplicationLanguage = getApplicationLanguage()
): RouteBootstrapPresentation {
  const copy = resolveRunStatesCopy(language);
  switch (workbenchState.kind) {
    case 'runs-error':
    case 'run-error':
      return createFailedRouteBootstrapPresentation(workbenchState.message);
    case 'run-loading':
      return createPendingRouteBootstrapPresentation(copy.routeLoadingRun(workbenchState.runId));
    case 'runs-list':
      return workbenchState.isLoading && workbenchState.runs.length === 0
        ? createPendingRouteBootstrapPresentation(copy.routeLoadingRuns)
        : createCompleteRouteBootstrapPresentation(copy.routeRunsReady);
    case 'runs-empty':
      return createCompleteRouteBootstrapPresentation(copy.routeRunsReadyEmpty);
    case 'run-missing':
      return createCompleteRouteBootstrapPresentation(copy.routeRunMissing(workbenchState.runId));
    case 'run-workspace':
      return createCompleteRouteBootstrapPresentation(copy.routeRunDetailReady);
  }
}
