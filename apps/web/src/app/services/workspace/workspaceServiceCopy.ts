import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';

export type WorkspaceServiceCopy = {
  readonly warehouseImportApiModeUnavailable: string;
};

type WorkspaceServiceLanguage = 'en' | 'es';

const COPY_BY_KEY: Record<keyof WorkspaceServiceCopy, LocalizableString> = {
  warehouseImportApiModeUnavailable: {
    key: 'workspace.import.apiModeUnavailable',
    fallback:
      'Warehouse source import is not available in API mode until the backend endpoint is implemented.',
  },
};

const LOCALIZED_COPY_BY_LANGUAGE: Record<WorkspaceServiceLanguage, WorkspaceServiceCopy | null> = {
  en: null,
  es: {
    warehouseImportApiModeUnavailable:
      'La importación de fuentes del warehouse no está disponible en modo API hasta que exista el endpoint del backend.',
  },
};

function resolveWorkspaceServiceLanguage(locale?: string): WorkspaceServiceLanguage {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (normalizedLocale?.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

export function detectWorkspaceServiceLocale(): string {
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

export function resolveWorkspaceServiceCopy(locale?: string): WorkspaceServiceCopy {
  const localizedCopy = LOCALIZED_COPY_BY_LANGUAGE[resolveWorkspaceServiceLanguage(locale)];
  if (localizedCopy) {
    return localizedCopy;
  }

  return {
    warehouseImportApiModeUnavailable: resolveString(COPY_BY_KEY.warehouseImportApiModeUnavailable),
  };
}
