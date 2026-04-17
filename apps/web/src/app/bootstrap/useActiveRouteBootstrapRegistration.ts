import { useMemo } from 'react';
import { useMatches } from 'react-router';

import { getRouteBootstrapRegistration } from './routeBootstrapRegistration';

export function useActiveRouteBootstrapRegistration() {
  const matches = useMatches();

  return useMemo(() => {
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const registration = getRouteBootstrapRegistration(
        matches[index]?.id,
        matches[index]?.handle
      );
      if (registration) {
        return registration;
      }
    }

    return null;
  }, [matches]);
}
