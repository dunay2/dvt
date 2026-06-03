/** Owned concern: define the Cost plugin route bootstrap contract handle. */
import { createPublishedRouteBootstrapHandle } from '../../bootstrap/routeBootstrapContract';

export const COST_ROUTE_BOOTSTRAP_HANDLE = createPublishedRouteBootstrapHandle({
  pendingDetail: 'Preparing Cost route',
});
