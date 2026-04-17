import { resolveString, type LocalizableString } from '../plugins/contracts/PluginManifest';

export type RouteBootstrapErrorCopy = {
  readonly dataRouterContextMissing: string;
  readonly registrationNotFoundPrefix: string;
};

const COPY_BY_KEY: Record<keyof RouteBootstrapErrorCopy, LocalizableString> = {
  dataRouterContextMissing: {
    key: 'bootstrap.route.dataRouterContextMissing',
    fallback:
      'Route bootstrap requires a React Router data router context (RouterProvider).',
  },
  registrationNotFoundPrefix: {
    key: 'bootstrap.route.registrationNotFoundPrefix',
    fallback: 'Route bootstrap registration not found for route id',
  },
};

export function detectRouteBootstrapLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  return navigator.language || 'en';
}

export function resolveRouteBootstrapErrorCopy(locale?: string): RouteBootstrapErrorCopy {
  return {
    dataRouterContextMissing: resolveString(COPY_BY_KEY.dataRouterContextMissing, locale),
    registrationNotFoundPrefix: resolveString(COPY_BY_KEY.registrationNotFoundPrefix, locale),
  };
}

export function formatRouteBootstrapRegistrationNotFoundMessage(
  routeId: string,
  locale?: string
): string {
  const copy = resolveRouteBootstrapErrorCopy(locale);
  return `${copy.registrationNotFoundPrefix}: ${routeId}`;
}
