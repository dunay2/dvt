import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapPresentation';
import type {
  DiffCompareContextState,
  DiffSqlContextState,
  DiffWorkbenchState,
} from './diffWorkbenchStateModel';

export const DIFF_ROUTE_ID = 'dbt.diff';

export const DIFF_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: 'Preparing Diff route',
});

type DiffRouteBootstrapArgs = {
  workbenchState: DiffWorkbenchState;
  compareContextState: DiffCompareContextState;
  sqlContextState: DiffSqlContextState;
};

export function deriveDiffRouteBootstrapPresentation({
  workbenchState,
  compareContextState,
  sqlContextState,
}: DiffRouteBootstrapArgs): RouteBootstrapPresentation {
  if (workbenchState.kind === 'loading') {
    return createPendingRouteBootstrapPresentation(
      'Loading diff changes for the route'
    );
  }

  if (workbenchState.kind === 'error') {
    return createErrorRouteBootstrapPresentation(workbenchState.message);
  }

  if (workbenchState.kind === 'empty') {
    return createCompleteRouteBootstrapPresentation(
      'Diff route is ready with no changes'
    );
  }

  if (
    compareContextState.kind === 'loading' ||
    sqlContextState.kind === 'loading'
  ) {
    return createPendingRouteBootstrapPresentation(
      'Loading compare context for the diff route'
    );
  }

  if (sqlContextState.kind === 'error') {
    return createErrorRouteBootstrapPresentation(sqlContextState.message);
  }

  return createCompleteRouteBootstrapPresentation('Diff route is ready');
}
