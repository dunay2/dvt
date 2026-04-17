import { useEffect } from 'react';

import {
  publishRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
  type RouteBootstrapPresentation,
} from './routeBootstrapPresentation';
import { detectRouteBootstrapLocale } from './routeBootstrapErrorCopy';
import { RouteBootstrapRegistrationNotFoundError } from './routeBootstrapErrors';
import { useActiveRouteBootstrapRegistration } from './useActiveRouteBootstrapRegistration';

function isTestRuntime(): boolean {
  return Boolean(import.meta.env?.MODE === 'test' || import.meta.env?.VITEST);
}

export function usePublishedRouteBootstrap(
  routeId: string,
  presentation: RouteBootstrapPresentation
): void {
  const allowMissingDataRouterContext = isTestRuntime();
  const locale = detectRouteBootstrapLocale();
  const registration = useActiveRouteBootstrapRegistration(routeId, {
    allowMissingDataRouterContext,
    locale,
  });

  useEffect(() => {
    if (!registration) {
      if (allowMissingDataRouterContext) {
        return;
      }

      throw new RouteBootstrapRegistrationNotFoundError(routeId, {
        locale,
      });
    }

    if (registration?.routeBootstrap.mode !== 'published') {
      return;
    }

    publishRouteBootstrapPresentation(registration, presentation);
  }, [
    allowMissingDataRouterContext,
    presentation.canComplete,
    presentation.detail,
    presentation.status,
    registration,
    routeId,
    locale,
  ]);

  useEffect(() => {
    if (!registration || registration.routeBootstrap.mode !== 'published') {
      return;
    }

    return () => {
      resetRouteBootstrapPresentation(registration);
    };
  }, [registration]);
}
