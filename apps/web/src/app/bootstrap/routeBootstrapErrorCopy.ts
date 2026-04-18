import { resolveString, type LocalizableString } from '../plugins/contracts/PluginManifest';

export type RouteBootstrapErrorCopy = {
  readonly dataRouterContextMissing: string;
  readonly registrationNotFoundPrefix: string;
};

type RouteBootstrapLanguage = 'en' | 'es';

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

const LOCALIZED_COPY_BY_LANGUAGE: Record<RouteBootstrapLanguage, RouteBootstrapErrorCopy | null> = {
  en: null,
  es: {
    dataRouterContextMissing:
      'El bootstrap de ruta requiere un contexto de React Router data router (RouterProvider).',
    registrationNotFoundPrefix:
      'No se encontro el registro de route bootstrap para route id',
  },
};

function resolveRouteBootstrapLanguage(locale?: string): RouteBootstrapLanguage {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (normalizedLocale?.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

export function detectRouteBootstrapLocale(): string {
  if (typeof navigator !== 'undefined') {
    const navigatorLocale = navigator.language || navigator.languages?.[0];
    if (navigatorLocale) {
      return navigatorLocale;
    }
  }

  const documentLocale =
    typeof document === 'undefined' ? '' : document.documentElement.lang?.trim();
  if (documentLocale) {
    return documentLocale;
  }
  return 'en';
}

export function resolveRouteBootstrapErrorCopy(locale?: string): RouteBootstrapErrorCopy {
  const localizedCopy = LOCALIZED_COPY_BY_LANGUAGE[resolveRouteBootstrapLanguage(locale)];
  if (localizedCopy) {
    return localizedCopy;
  }

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
