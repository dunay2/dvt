/** Owned concern: publish and render the invalid Canvas authority route state. */
import { useMemo } from 'react';

import { createFailedRouteBootstrapPresentation } from '../../bootstrap/routeBootstrapContract';
import { usePublishedRouteBootstrap } from '../../bootstrap/usePublishedRouteBootstrap';
import { CANVAS_ROUTE_ID } from './canvasDraftPresentationStore';
import { CanvasErrorStateView } from './CanvasStateViews';

export function CanvasInvalidAuthorityState({
  message,
}: Readonly<{ message: string }>): JSX.Element {
  const bootstrapPresentation = useMemo(
    () => createFailedRouteBootstrapPresentation(message),
    [message]
  );
  usePublishedRouteBootstrap(CANVAS_ROUTE_ID, bootstrapPresentation);

  return <CanvasErrorStateView title="Canvas authority unavailable" message={message} />;
}
