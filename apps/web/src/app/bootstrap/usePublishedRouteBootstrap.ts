import { useEffect, useMemo } from 'react';
import { useMatches } from 'react-router';

import {
  getRouteBootstrapRegistration,
  publishRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from './routeBootstrapPresentation';

export function usePublishedRouteBootstrap(
  presentation: RouteBootstrapPresentation
): void {
  const matches = useMatches();
  const registration = useMemo(() => {
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const candidate = getRouteBootstrapRegistration(
        matches[index]?.id,
        matches[index]?.handle
      );
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }, [matches]);

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
