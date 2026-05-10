import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';

export type WorkspacePortCopy = {
  readonly warehouseImportApiModeUnavailable: string;
};

type WorkspacePortLanguage = 'en' | 'es';

const COPY_BY_KEY: Record<keyof WorkspacePortCopy, LocalizableString> = {
  warehouseImportApiModeUnavailable: {
    key: 'workspace.import.apiModeUnavailable',
    fallback:
      'Warehouse source import is not available in API mode until the backend endpoint is implemented.',
  },
};

const LOCALIZED_COPY_BY_LANGUAGE: Record<WorkspacePortLanguage, WorkspacePortCopy | null> = {
  en: null,
  es: {
    warehouseImportApiModeUnavailable:
      'La importaci�n de fuentes del warehouse no est� disponible en modo API hasta que exista el endpoint del backend.',
  },
};

function resolveWorkspacePortLanguage(locale?: string): WorkspacePortLanguage {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (normalizedLocale?.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

export function detectWorkspacePortLocale(): string {
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

export function resolveWorkspacePortCopy(locale?: string): WorkspacePortCopy {
  const localizedCopy = LOCALIZED_COPY_BY_LANGUAGE[resolveWorkspacePortLanguage(locale)];
  if (localizedCopy) {
    return localizedCopy;
  }

  return {
    warehouseImportApiModeUnavailable: resolveString(COPY_BY_KEY.warehouseImportApiModeUnavailable),
  };
}
