/** Owned concern: resolve route-visible Canvas template copy from registry input. */
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import { detectCanvasViewLocale } from './canvasCopyCatalog';

export type CanvasTemplatePresentation = Readonly<{
  registration: CanvasKindRegistration;
  kind: CanvasKindRegistration['kind'];
  title: string;
  description: string;
}>;

type CanvasTemplateCopy = Readonly<{
  title: string;
  description: string;
}>;

const BUILT_IN_SPANISH_TEMPLATE_COPY: Record<string, CanvasTemplateCopy> = {
  dbt: {
    title: 'Canvas dbt',
    description: 'Canvas model-first para recursos y dependencias dbt.',
  },
  transformation: {
    title: 'Canvas de transformacion',
    description: 'Canvas de flujo para el draft protegido de authoring.',
  },
};

function resolveCanvasTemplateLanguage(locale?: string): 'en' | 'es' {
  return locale?.trim().toLowerCase().startsWith('es') ? 'es' : 'en';
}

function resolveBuiltInTemplateCopy(
  registration: CanvasKindRegistration,
  locale?: string
): CanvasTemplateCopy | null {
  if (resolveCanvasTemplateLanguage(locale) !== 'es') {
    return null;
  }

  return BUILT_IN_SPANISH_TEMPLATE_COPY[registration.kind] ?? null;
}

export function resolveCanvasTemplatePresentation(
  registration: CanvasKindRegistration,
  locale: string = detectCanvasViewLocale()
): CanvasTemplatePresentation {
  const localizedCopy = resolveBuiltInTemplateCopy(registration, locale);

  return {
    registration,
    kind: registration.kind,
    title: localizedCopy?.title ?? registration.createTitle,
    description: localizedCopy?.description ?? registration.description,
  };
}
