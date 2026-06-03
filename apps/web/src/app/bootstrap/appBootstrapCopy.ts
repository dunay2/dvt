/** Owned concern: resolve locale-aware copy for the pre-React app bootstrap domain. */
import { resolveString, type LocalizableString } from '../plugins/contracts/PluginManifest';

export type AppBootstrapLanguage = 'en' | 'es';

export type AppBootstrapCopy = Readonly<{
  startupStatusLabel: string;
  preparingTitle: string;
  preparingMessage: string;
  blockedTitle: string;
  blockedMessageFallback: string;
  errorTitle: string;
  errorMessageFallback: string;
  completeTitle: string;
  completeMessage: string;
  progressKicker: string;
  progressListLabel: string;
  progressCountSuffix: string;
  progressSettledLabel: string;
  progressBlockedSuffix: string;
  progressErrorSuffix: string;
  versionPrefix: string;
  buildPrefix: string;
  hydrateLabel: string;
  hydratePendingDetail: string;
  hydrateCompleteDetail: string;
  servicesLabel: string;
  servicesPendingDetail: string;
  servicesCompleteDetail: string;
  capabilitiesLabel: string;
  capabilitiesPendingDetail: string;
  capabilitiesCompleteDetail: string;
  capabilitiesFallbackDetail: string;
  healthLabel: string;
  healthPendingDetail: string;
  healthCompleteDetail: string;
  healthFailureFallbackDetail: string;
  routeLabel: string;
  routePendingDetail: string;
  routeCompleteDetail: string;
  routeWaitingForCapabilitiesDetail: string;
  degradedStepDetailSuffix: string;
  failedStepDetailSuffix: string;
  blockedStepDetailSuffix: string;
  errorStepDetailSuffix: string;
}>;

type AppBootstrapCopyKey = keyof AppBootstrapCopy;

const COPY_BY_KEY: Record<AppBootstrapCopyKey, LocalizableString> = {
  startupStatusLabel: {
    key: 'app.bootstrap.startupStatusLabel',
    fallback: 'Raven startup status',
  },
  preparingTitle: { key: 'app.bootstrap.preparingTitle', fallback: 'Preparing Raven' },
  preparingMessage: {
    key: 'app.bootstrap.preparingMessage',
    fallback: 'Loading startup modules in order. The workspace opens once bootstrap settles.',
  },
  blockedTitle: {
    key: 'app.bootstrap.blockedTitle',
    fallback: 'Raven is waiting for startup prerequisites',
  },
  blockedMessageFallback: {
    key: 'app.bootstrap.blockedMessageFallback',
    fallback: 'Startup is blocked until the required platform prerequisites are available.',
  },
  errorTitle: {
    key: 'app.bootstrap.errorTitle',
    fallback: 'Raven could not finish startup',
  },
  errorMessageFallback: {
    key: 'app.bootstrap.errorMessageFallback',
    fallback: 'An unexpected startup error occurred.',
  },
  completeTitle: { key: 'app.bootstrap.completeTitle', fallback: 'Raven is ready' },
  completeMessage: { key: 'app.bootstrap.completeMessage', fallback: 'Opening the workspace.' },
  progressKicker: { key: 'app.bootstrap.progressKicker', fallback: 'Startup readiness' },
  progressListLabel: {
    key: 'app.bootstrap.progressListLabel',
    fallback: 'Startup readiness checks',
  },
  progressCountSuffix: { key: 'app.bootstrap.progressCountSuffix', fallback: 'checks' },
  progressSettledLabel: {
    key: 'app.bootstrap.progressSettledLabel',
    fallback: 'startup checks settled',
  },
  progressBlockedSuffix: {
    key: 'app.bootstrap.progressBlockedSuffix',
    fallback: 'Required startup blockers remain.',
  },
  progressErrorSuffix: {
    key: 'app.bootstrap.progressErrorSuffix',
    fallback: 'Startup error needs attention.',
  },
  versionPrefix: { key: 'app.bootstrap.versionPrefix', fallback: 'Version' },
  buildPrefix: { key: 'app.bootstrap.buildPrefix', fallback: 'Build' },
  hydrateLabel: { key: 'app.bootstrap.hydrateLabel', fallback: 'Hydrating application' },
  hydratePendingDetail: {
    key: 'app.bootstrap.hydratePendingDetail',
    fallback: 'Mounting the Raven shell',
  },
  hydrateCompleteDetail: {
    key: 'app.bootstrap.hydrateCompleteDetail',
    fallback: 'Application shell mounted',
  },
  servicesLabel: { key: 'app.bootstrap.servicesLabel', fallback: 'Preparing app services' },
  servicesPendingDetail: {
    key: 'app.bootstrap.servicesPendingDetail',
    fallback: 'Building app services and query client',
  },
  servicesCompleteDetail: {
    key: 'app.bootstrap.servicesCompleteDetail',
    fallback: 'App services and query client ready',
  },
  capabilitiesLabel: {
    key: 'app.bootstrap.capabilitiesLabel',
    fallback: 'Loading runtime capabilities',
  },
  capabilitiesPendingDetail: {
    key: 'app.bootstrap.capabilitiesPendingDetail',
    fallback: 'Resolving enabled plugins and workspace surfaces',
  },
  capabilitiesCompleteDetail: {
    key: 'app.bootstrap.capabilitiesCompleteDetail',
    fallback: 'Runtime capabilities loaded',
  },
  capabilitiesFallbackDetail: {
    key: 'app.bootstrap.capabilitiesFallbackDetail',
    fallback: 'Capabilities could not be loaded. Using the fallback shell configuration.',
  },
  healthLabel: { key: 'app.bootstrap.healthLabel', fallback: 'Checking platform health' },
  healthPendingDetail: {
    key: 'app.bootstrap.healthPendingDetail',
    fallback: 'Polling health and readiness endpoints',
  },
  healthCompleteDetail: {
    key: 'app.bootstrap.healthCompleteDetail',
    fallback: 'Platform health settled.',
  },
  healthFailureFallbackDetail: {
    key: 'app.bootstrap.healthFailureFallbackDetail',
    fallback: 'Platform health probes failed during startup.',
  },
  routeLabel: { key: 'app.bootstrap.routeLabel', fallback: 'Preparing initial route' },
  routePendingDetail: {
    key: 'app.bootstrap.routePendingDetail',
    fallback: 'Preparing the active workspace surface',
  },
  routeCompleteDetail: {
    key: 'app.bootstrap.routeCompleteDetail',
    fallback: 'Initial route is ready',
  },
  routeWaitingForCapabilitiesDetail: {
    key: 'app.bootstrap.routeWaitingForCapabilitiesDetail',
    fallback: 'Waiting for runtime capabilities before route readiness.',
  },
  degradedStepDetailSuffix: {
    key: 'app.bootstrap.degradedStepDetailSuffix',
    fallback: 'settled with degraded startup conditions.',
  },
  failedStepDetailSuffix: {
    key: 'app.bootstrap.failedStepDetailSuffix',
    fallback: 'failed but does not block shell startup.',
  },
  blockedStepDetailSuffix: {
    key: 'app.bootstrap.blockedStepDetailSuffix',
    fallback: 'is blocked by a required startup prerequisite.',
  },
  errorStepDetailSuffix: {
    key: 'app.bootstrap.errorStepDetailSuffix',
    fallback: 'failed during startup.',
  },
};

const SPANISH_COPY: AppBootstrapCopy = {
  startupStatusLabel: 'Estado de arranque de Raven',
  preparingTitle: 'Preparando Raven',
  preparingMessage:
    'Cargando los modulos de arranque en orden. El workspace se abre cuando el bootstrap queda resuelto.',
  blockedTitle: 'Raven esta esperando prerrequisitos de arranque',
  blockedMessageFallback:
    'El arranque esta bloqueado hasta que los prerrequisitos de plataforma esten disponibles.',
  errorTitle: 'Raven no pudo terminar el arranque',
  errorMessageFallback: 'Se produjo un error inesperado durante el arranque.',
  completeTitle: 'Raven esta listo',
  completeMessage: 'Abriendo el workspace.',
  progressKicker: 'Preparacion de arranque',
  progressListLabel: 'Comprobaciones de preparacion de arranque',
  progressCountSuffix: 'checks',
  progressSettledLabel: 'comprobaciones de arranque resueltas',
  progressBlockedSuffix: 'Quedan bloqueos de arranque requeridos.',
  progressErrorSuffix: 'El error de arranque requiere atencion.',
  versionPrefix: 'Version',
  buildPrefix: 'Build',
  hydrateLabel: 'Hidratando la aplicacion',
  hydratePendingDetail: 'Montando la shell de Raven',
  hydrateCompleteDetail: 'Shell de aplicacion montada',
  servicesLabel: 'Preparando servicios de aplicacion',
  servicesPendingDetail: 'Construyendo servicios de aplicacion y query client',
  servicesCompleteDetail: 'Servicios de aplicacion y query client preparados',
  capabilitiesLabel: 'Cargando capacidades de runtime',
  capabilitiesPendingDetail: 'Resolviendo plugins y superficies de workspace habilitados',
  capabilitiesCompleteDetail: 'Capacidades de runtime cargadas',
  capabilitiesFallbackDetail:
    'No se pudieron cargar las capacidades. Se usa la configuracion fallback de la shell.',
  healthLabel: 'Comprobando salud de plataforma',
  healthPendingDetail: 'Consultando endpoints de health y readiness',
  healthCompleteDetail: 'Salud de plataforma resuelta.',
  healthFailureFallbackDetail:
    'Las comprobaciones de salud de plataforma fallaron durante el arranque.',
  routeLabel: 'Preparando ruta inicial',
  routePendingDetail: 'Preparando la superficie activa del workspace',
  routeCompleteDetail: 'Ruta inicial preparada',
  routeWaitingForCapabilitiesDetail:
    'Esperando las capacidades de runtime antes de resolver la ruta.',
  degradedStepDetailSuffix: 'quedo resuelto con condiciones de arranque degradadas.',
  failedStepDetailSuffix: 'fallo pero no bloquea el arranque de la shell.',
  blockedStepDetailSuffix: 'esta bloqueado por un prerrequisito de arranque requerido.',
  errorStepDetailSuffix: 'fallo durante el arranque.',
};

const LOCALIZED_COPY_BY_LANGUAGE: Record<AppBootstrapLanguage, AppBootstrapCopy | null> = {
  en: null,
  es: SPANISH_COPY,
};

function resolveAppBootstrapLanguage(locale?: string): AppBootstrapLanguage {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (normalizedLocale?.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

export function detectAppBootstrapLocale(): string {
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

export function resolveAppBootstrapCopy(
  locale: string = detectAppBootstrapLocale()
): AppBootstrapCopy {
  const localizedCopy = LOCALIZED_COPY_BY_LANGUAGE[resolveAppBootstrapLanguage(locale)];
  if (localizedCopy) {
    return localizedCopy;
  }

  return Object.fromEntries(
    Object.entries(COPY_BY_KEY).map(([key, value]) => [key, resolveString(value, locale)])
  ) as AppBootstrapCopy;
}
