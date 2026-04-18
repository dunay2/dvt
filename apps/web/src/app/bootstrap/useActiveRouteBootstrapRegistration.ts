import { useMemo } from 'react';
import { useMatches } from 'react-router';

import { detectRouteBootstrapLocale } from './routeBootstrapErrorCopy';
import { useHasDataRouterContext } from './routeBootstrapDataRouterContext';
import { RouteBootstrapDataRouterContextError } from './routeBootstrapErrors';
import { getRouteBootstrapRegistration } from './routeBootstrapRegistration';

type UseActiveRouteBootstrapRegistrationOptions = {
  readonly allowMissingDataRouterContext?: boolean;
  readonly locale?: string;
};

function useMatchesSafely({
  allowMissingDataRouterContext,
  locale,
}: Required<UseActiveRouteBootstrapRegistrationOptions>) {
  const hasDataRouterContext = useHasDataRouterContext();

  try {
    return useMatches();
  } catch (cause) {
    if (hasDataRouterContext) {
      throw cause;
    }

    if (allowMissingDataRouterContext) {
      return [];
    }

    throw new RouteBootstrapDataRouterContextError({
      cause,
      locale,
    });
  }
}

export function useActiveRouteBootstrapRegistration(
  routeId?: string,
  options: UseActiveRouteBootstrapRegistrationOptions = {}
) {
  const locale = options.locale ?? detectRouteBootstrapLocale();
  const matches = useMatchesSafely({
    allowMissingDataRouterContext: options.allowMissingDataRouterContext ?? false,
    locale,
  });

  return useMemo(() => {
    if (routeId) {
      const routeMatch = matches.find((match) => match.id === routeId);
      return getRouteBootstrapRegistration(routeMatch?.id, routeMatch?.handle);
    }

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
  }, [matches, routeId]);
}
