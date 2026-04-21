import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy, CanvasViewLanguage } from './canvasCopy.types';
import { canvasViewAuthoringCopyByKey } from './canvasCopyCatalog.authoring';
import { canvasViewAuthoringCopyEs } from './canvasCopyCatalog.authoring.es';
import { canvasViewExecutionCopyByKey } from './canvasCopyCatalog.execution';
import { canvasViewExecutionCopyEs } from './canvasCopyCatalog.execution.es';
import { canvasViewRouteCopyByKey } from './canvasCopyCatalog.route';
import { canvasViewRouteCopyEs } from './canvasCopyCatalog.route.es';
import { canvasViewToolbarCopyByKey } from './canvasCopyCatalog.toolbar';
import { canvasViewToolbarCopyEs } from './canvasCopyCatalog.toolbar.es';

const COPY_BY_KEY = {
  ...canvasViewRouteCopyByKey,
  ...canvasViewToolbarCopyByKey,
  ...canvasViewAuthoringCopyByKey,
  ...canvasViewExecutionCopyByKey,
} satisfies Record<keyof CanvasViewCopy, LocalizableString>;

const LOCALIZED_COPY_BY_LANGUAGE: Record<CanvasViewLanguage, CanvasViewCopy | null> = {
  en: null,
  es: {
    ...canvasViewRouteCopyEs,
    ...canvasViewToolbarCopyEs,
    ...canvasViewAuthoringCopyEs,
    ...canvasViewExecutionCopyEs,
  } satisfies CanvasViewCopy,
};

function resolveCanvasViewLanguage(locale?: string): CanvasViewLanguage {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (normalizedLocale?.startsWith('es')) {
    return 'es';
  }

  return 'en';
}

export function detectCanvasViewLocale(): string {
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

export function resolveCanvasViewCopy(locale: string = detectCanvasViewLocale()): CanvasViewCopy {
  const localizedCopy = LOCALIZED_COPY_BY_LANGUAGE[resolveCanvasViewLanguage(locale)];
  if (localizedCopy) {
    return localizedCopy;
  }

  return Object.fromEntries(
    Object.entries(COPY_BY_KEY).map(([key, value]) => [key, resolveString(value, locale)])
  ) as CanvasViewCopy;
}

export const canvasViewCopy = resolveCanvasViewCopy();
