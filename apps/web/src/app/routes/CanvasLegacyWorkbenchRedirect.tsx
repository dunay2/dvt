/** Owned concern: adapt retired Canvas workbench URLs to the canonical Canvas route. */
import { Navigate, useLocation, useParams } from 'react-router';

import { resolveLegacyCanvasRouteIntent } from '../views/canvas/canvasLegacyRouteIntent';

export function CanvasLegacyWorkbenchRedirect(): JSX.Element {
  const location = useLocation();
  const params = useParams<'*'>();
  const destination = resolveLegacyCanvasRouteIntent({
    legacyPath: params['*'],
    search: location.search,
  });

  return <Navigate to={destination} replace />;
}
