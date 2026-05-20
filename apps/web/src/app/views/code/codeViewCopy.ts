/** Owned concern: resolve locale-aware copy for the Code workbench route. */
import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';

export type CodeViewLanguage = 'en' | 'es';

export type CodeViewCopy = Readonly<{
  title: string;
  subtitle: string;
  explorerTitle: string;
  editorLoadingMessage: string;
  editorAriaLabelPrefix: string;
  localBufferTitle: string;
  localBufferMessage: string;
  localBufferNote: string;
  routeLoadingMessage: string;
  routeEmptyTitle: string;
  routeEmptyMessage: string;
  routeErrorTitle: string;
  routeErrorMessage: string;
  previewLoadingMessage: string;
  previewEmptyTitle: string;
  previewEmptyMessage: string;
  previewErrorTitle: string;
  previewErrorMessage: string;
  previewMissingTitle: string;
  previewMissingMessagePrefix: string;
  bootstrapLoadingFilesDetail: string;
  bootstrapNoWorkspaceFilesDetail: string;
  bootstrapLoadingPreviewDetail: string;
  bootstrapReadyDetail: string;
}>;

const COPY_BY_KEY: Record<keyof CodeViewCopy, LocalizableString> = {
  title: { key: 'code.title', fallback: 'Code' },
  subtitle: {
    key: 'code.subtitle',
    fallback: 'Browse workspace files and edit a local Monaco buffer.',
  },
  explorerTitle: { key: 'code.explorerTitle', fallback: 'Explorer' },
  editorLoadingMessage: {
    key: 'code.editorLoadingMessage',
    fallback: 'Loading Monaco editor...',
  },
  editorAriaLabelPrefix: { key: 'code.editorAriaLabelPrefix', fallback: 'Editing' },
  localBufferTitle: { key: 'code.localBufferTitle', fallback: 'Editable local buffer' },
  localBufferMessage: {
    key: 'code.localBufferMessage',
    fallback: 'Type in Monaco while reviewing workspace files.',
  },
  localBufferNote: {
    key: 'code.localBufferNote',
    fallback: 'Changes are local until a governed save command exists.',
  },
  routeLoadingMessage: { key: 'code.routeLoadingMessage', fallback: 'Loading workspace files...' },
  routeEmptyTitle: {
    key: 'code.routeEmptyTitle',
    fallback: 'No workspace files available',
  },
  routeEmptyMessage: {
    key: 'code.routeEmptyMessage',
    fallback: 'This workspace does not expose files to browse yet.',
  },
  routeErrorTitle: {
    key: 'code.routeErrorTitle',
    fallback: 'Workspace files unavailable',
  },
  routeErrorMessage: {
    key: 'code.routeErrorMessage',
    fallback: 'The file explorer could not be loaded right now.',
  },
  previewLoadingMessage: {
    key: 'code.previewLoadingMessage',
    fallback: 'Loading file preview...',
  },
  previewEmptyTitle: {
    key: 'code.previewEmptyTitle',
    fallback: 'Select a file to preview',
  },
  previewEmptyMessage: {
    key: 'code.previewEmptyMessage',
    fallback: 'Choose a file from the explorer to inspect its contents.',
  },
  previewErrorTitle: {
    key: 'code.previewErrorTitle',
    fallback: 'File preview unavailable',
  },
  previewErrorMessage: {
    key: 'code.previewErrorMessage',
    fallback: 'The selected file could not be loaded right now.',
  },
  previewMissingTitle: {
    key: 'code.previewMissingTitle',
    fallback: 'Selected file unavailable',
  },
  previewMissingMessagePrefix: {
    key: 'code.previewMissingMessagePrefix',
    fallback: 'The selected file is no longer available in this workspace:',
  },
  bootstrapLoadingFilesDetail: {
    key: 'code.bootstrapLoadingFilesDetail',
    fallback: 'Loading workspace files for the code route',
  },
  bootstrapNoWorkspaceFilesDetail: {
    key: 'code.bootstrapNoWorkspaceFilesDetail',
    fallback: 'Code route is ready with no workspace files',
  },
  bootstrapLoadingPreviewDetail: {
    key: 'code.bootstrapLoadingPreviewDetail',
    fallback: 'Loading the initial file preview for the code route',
  },
  bootstrapReadyDetail: {
    key: 'code.bootstrapReadyDetail',
    fallback: 'Code route is ready',
  },
};

const SPANISH_COPY: CodeViewCopy = {
  title: 'Codigo',
  subtitle: 'Explora archivos del workspace y edita un buffer local en Monaco.',
  explorerTitle: 'Explorador',
  editorLoadingMessage: 'Cargando editor Monaco...',
  editorAriaLabelPrefix: 'Editando',
  localBufferTitle: 'Buffer local editable',
  localBufferMessage: 'Escribe en Monaco mientras revisas archivos del workspace.',
  localBufferNote: 'Los cambios son locales hasta que exista un comando gobernado de guardado.',
  routeLoadingMessage: 'Cargando archivos del workspace...',
  routeEmptyTitle: 'No hay archivos del workspace disponibles',
  routeEmptyMessage: 'Este workspace todavia no expone archivos para explorar.',
  routeErrorTitle: 'Archivos del workspace no disponibles',
  routeErrorMessage: 'No se pudo cargar el explorador de archivos ahora.',
  previewLoadingMessage: 'Cargando vista previa del archivo...',
  previewEmptyTitle: 'Selecciona un archivo para previsualizar',
  previewEmptyMessage: 'Elige un archivo del explorador para inspeccionar su contenido.',
  previewErrorTitle: 'Vista previa de archivo no disponible',
  previewErrorMessage: 'No se pudo cargar el archivo seleccionado ahora.',
  previewMissingTitle: 'Archivo seleccionado no disponible',
  previewMissingMessagePrefix: 'El archivo seleccionado ya no esta disponible en este workspace:',
  bootstrapLoadingFilesDetail: 'Cargando archivos del workspace para la ruta de codigo',
  bootstrapNoWorkspaceFilesDetail: 'La ruta de codigo esta lista sin archivos del workspace',
  bootstrapLoadingPreviewDetail: 'Cargando la vista previa inicial del archivo',
  bootstrapReadyDetail: 'La ruta de codigo esta lista',
};

const LOCALIZED_COPY_BY_LANGUAGE: Record<CodeViewLanguage, CodeViewCopy | null> = {
  en: null,
  es: SPANISH_COPY,
};

function resolveCodeViewLanguage(locale?: string): CodeViewLanguage {
  return locale?.trim().toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function detectCodeViewLocale(): string {
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

export function resolveCodeViewCopy(locale: string = detectCodeViewLocale()): CodeViewCopy {
  const localizedCopy = LOCALIZED_COPY_BY_LANGUAGE[resolveCodeViewLanguage(locale)];
  if (localizedCopy) {
    return localizedCopy;
  }

  return Object.fromEntries(
    Object.entries(COPY_BY_KEY).map(([key, value]) => [key, resolveString(value, locale)])
  ) as CodeViewCopy;
}

export const codeViewCopy = resolveCodeViewCopy();
