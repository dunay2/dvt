/** Owned concern: resolve locale-aware copy for the root route error boundary. */
import { resolveString, type LocalizableString } from './plugins/contracts/PluginManifest';
import { detectRouteBootstrapLocale } from './bootstrap/routeBootstrapErrorCopy';

export type AppRouteErrorBoundaryLanguage = 'en' | 'es';

export type AppRouteErrorBoundaryCopy = Readonly<{
  brandLabel: string;
  title: string;
  message: string;
  errorLabel: string;
  reloadLabel: string;
  homeLabel: string;
  unexpectedRouteError: string;
}>;

const COPY_BY_KEY: Record<keyof AppRouteErrorBoundaryCopy, LocalizableString> = {
  brandLabel: { key: 'app.routeError.brandLabel', fallback: 'Raven' },
  title: {
    key: 'app.routeError.title',
    fallback: 'The application hit an unexpected error.',
  },
  message: {
    key: 'app.routeError.message',
    fallback:
      'The current view could not recover cleanly. Reload the application to restore the shell, or return to the workspace root.',
  },
  errorLabel: { key: 'app.routeError.errorLabel', fallback: 'Error' },
  reloadLabel: { key: 'app.routeError.reloadLabel', fallback: 'Reload application' },
  homeLabel: { key: 'app.routeError.homeLabel', fallback: 'Return to workspace' },
  unexpectedRouteError: {
    key: 'app.routeError.unexpectedRouteError',
    fallback: 'An unexpected route error occurred.',
  },
};

const SPANISH_COPY: AppRouteErrorBoundaryCopy = {
  brandLabel: 'Raven',
  title: 'La aplicacion encontro un error inesperado.',
  message:
    'La vista actual no pudo recuperarse limpiamente. Recarga la aplicacion para restaurar la shell o vuelve a la raiz del workspace.',
  errorLabel: 'Error',
  reloadLabel: 'Recargar aplicacion',
  homeLabel: 'Volver al workspace',
  unexpectedRouteError: 'Se produjo un error inesperado en la ruta.',
};

const LOCALIZED_COPY_BY_LANGUAGE: Record<
  AppRouteErrorBoundaryLanguage,
  AppRouteErrorBoundaryCopy | null
> = {
  en: null,
  es: SPANISH_COPY,
};

function resolveAppRouteErrorBoundaryLanguage(locale?: string): AppRouteErrorBoundaryLanguage {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (normalizedLocale?.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

export function resolveAppRouteErrorBoundaryCopy(
  locale: string = detectRouteBootstrapLocale()
): AppRouteErrorBoundaryCopy {
  const localizedCopy = LOCALIZED_COPY_BY_LANGUAGE[resolveAppRouteErrorBoundaryLanguage(locale)];
  if (localizedCopy) {
    return localizedCopy;
  }

  return Object.fromEntries(
    Object.entries(COPY_BY_KEY).map(([key, value]) => [key, resolveString(value, locale)])
  ) as AppRouteErrorBoundaryCopy;
}
