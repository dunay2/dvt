import { useEffect } from 'react';

import {
  publishRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from './routeBootstrapRegistry';
import type { RouteBootstrapPresentation } from './routeBootstrapContract';
import { detectRouteBootstrapLocale } from './routeBootstrapErrorCopy';
import { RouteBootstrapRegistrationNotFoundError } from './routeBootstrapErrors';
import { useActiveRouteBootstrapRegistration } from './useActiveRouteBootstrapRegistration';

function isTestRuntime(): boolean {
  return Boolean(import.meta.env?.MODE === 'test' || import.meta.env?.VITEST);
}

export function usePublishedRouteBootstrap(
  routeId: string,
  presentation: RouteBootstrapPresentation,
  options: Readonly<{ enabled?: boolean }> = {}
): void {
  const enabled = options.enabled ?? true;
  const allowMissingDataRouterContext = isTestRuntime() || !enabled;
  const locale = detectRouteBootstrapLocale();
  const registration = useActiveRouteBootstrapRegistration(enabled ? routeId : undefined, {
    allowMissingDataRouterContext,
    locale,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

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
    enabled,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!registration || registration.routeBootstrap.mode !== 'published') {
      return;
    }

    return () => {
      resetRouteBootstrapPresentation(registration);
    };
  }, [enabled, registration]);
}
