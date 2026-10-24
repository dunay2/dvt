import { resolveCopyLanguage } from '../../copyLanguage';
import type { CanvasViewCopy, CanvasViewLanguage } from './canvasCopy.types';
import { canvasViewAuthoringCopyByKey } from './canvasCopyCatalog.authoring';
import { canvasViewAuthoringCopyEs } from './canvasCopyCatalog.authoring.es';
import { canvasViewExecutionCopyByKey } from './canvasCopyCatalog.execution';
import { canvasViewExecutionCopyEs } from './canvasCopyCatalog.execution.es';
import { canvasViewRouteCopyByKey } from './canvasCopyCatalog.route';
import { canvasViewRouteCopyEs } from './canvasCopyCatalog.route.es';
import { canvasViewToolbarCopyByKey } from './canvasCopyCatalog.toolbar';
import { canvasViewToolbarCopyEs } from './canvasCopyCatalog.toolbar.es';
import { getApplicationLanguage } from '../../stores/applicationLanguageStore';

const LOCALIZED_COPY_BY_LANGUAGE: Record<CanvasViewLanguage, CanvasViewCopy> = {
  en: {
    ...canvasViewRouteCopyByKey,
    ...canvasViewToolbarCopyByKey,
    ...canvasViewAuthoringCopyByKey,
    ...canvasViewExecutionCopyByKey,
  },
  es: {
    ...canvasViewRouteCopyEs,
    ...canvasViewToolbarCopyEs,
    ...canvasViewAuthoringCopyEs,
    ...canvasViewExecutionCopyEs,
  },
};

export function resolveCanvasViewCopy(locale: string = getApplicationLanguage()): CanvasViewCopy {
  return LOCALIZED_COPY_BY_LANGUAGE[resolveCopyLanguage(locale)];
}

export const canvasViewCopy = new Proxy({} as CanvasViewCopy, {
  get: (_target, key: keyof CanvasViewCopy) => resolveCanvasViewCopy(getApplicationLanguage())[key],
});
