import { useEffect } from 'react';

import {
  publishRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from './routeBootstrapPresentation';
import { useActiveRouteBootstrapRegistration } from './useActiveRouteBootstrapRegistration';

export function usePublishedRouteBootstrap(
  presentation: RouteBootstrapPresentation
): void {
  const registration = useActiveRouteBootstrapRegistration();

  useEffect(() => {
    if (registration?.routeBootstrap.mode !== 'published') {
      return;
    }

    publishRouteBootstrapPresentation(registration, presentation);

    return () => {
      resetRouteBootstrapPresentation(registration);
    };
  }, [
    presentation.canComplete,
    presentation.detail,
    presentation.status,
    registration,
  ]);
}
