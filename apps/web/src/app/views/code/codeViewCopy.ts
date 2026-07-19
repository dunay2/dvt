/** Owned concern: resolve locale-aware copy for the Code workbench route. */
import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';

export type CodeViewLanguage = 'en' | 'es';

export type CodeViewCopy = Readonly<{
  title: string;
  subtitle: string;
  explorerTitle: string;
  editorLoadingMessage: string;
  editorAriaLabelPrefix: string;
  workingTreeSynchronizedLabel: string;
  workingTreeSynchronizedMessage: string;
  workingTreeModifiedLabel: string;
  workingTreeModifiedMessage: string;
  workingTreeSyncingLabel: string;
  workingTreeSyncingMessage: string;
  workingTreeReconcilingLabel: string;
  workingTreeReconcilingMessage: string;
  workingTreeConflictLabel: string;
  workingTreeConflictMessage: string;
  workingTreeFailedLabel: string;
  workingTreeFailedMessage: string;
  workingTreeReconciliationFailedLabel: string;
  workingTreeReconciliationFailedMessage: string;
  workingTreePersistedStaleLabel: string;
  workingTreePersistedStaleMessage: string;
  workingTreePersistedInvalidLabel: string;
  workingTreePersistedInvalidMessage: string;
  workingTreePersistedUnavailableLabel: string;
  workingTreePersistedUnavailableMessage: string;
  workingTreePersistedVerificationUnavailableLabel: string;
  workingTreePersistedVerificationUnavailableMessage: string;
  workingTreePersistedSupersededLabel: string;
  workingTreePersistedSupersededMessage: string;
  workingTreeReadOnlyLabel: string;
  workingTreeReadOnlyMessage: string;
  workingTreeRetryLabel: string;
  workingTreeReloadLabel: string;
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
  historyTitle: string;
  historyNoFile: string;
  historyLoadingMessage: string;
  historyEmptyMessage: string;
  historyErrorMessage: string;
  historyOpenDiffLabel: string;
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
  workingTreeSynchronizedLabel: {
    key: 'code.workingTreeSynchronizedLabel',
    fallback: 'Synchronized',
  },
  workingTreeSynchronizedMessage: {
    key: 'code.workingTreeSynchronizedMessage',
    fallback: 'Working tree matches the editor.',
  },
  workingTreeModifiedLabel: { key: 'code.workingTreeModifiedLabel', fallback: 'Modified' },
  workingTreeModifiedMessage: {
    key: 'code.workingTreeModifiedMessage',
    fallback: 'Changes are waiting to synchronize.',
  },
  workingTreeSyncingLabel: { key: 'code.workingTreeSyncingLabel', fallback: 'Syncing' },
  workingTreeSyncingMessage: {
    key: 'code.workingTreeSyncingMessage',
    fallback: 'Updating the working tree.',
  },
  workingTreeReconcilingLabel: {
    key: 'code.workingTreeReconcilingLabel',
    fallback: 'Analyzing',
  },
  workingTreeReconcilingMessage: {
    key: 'code.workingTreeReconcilingMessage',
    fallback: 'The file is saved; refreshing the authoritative project analysis.',
  },
  workingTreeConflictLabel: { key: 'code.workingTreeConflictLabel', fallback: 'Conflict' },
  workingTreeConflictMessage: {
    key: 'code.workingTreeConflictMessage',
    fallback: 'Reload the newer working-tree revision before continuing.',
  },
  workingTreeFailedLabel: { key: 'code.workingTreeFailedLabel', fallback: 'Update failed' },
  workingTreeFailedMessage: {
    key: 'code.workingTreeFailedMessage',
    fallback: 'The working tree could not be updated.',
  },
  workingTreeReconciliationFailedLabel: {
    key: 'code.workingTreeReconciliationFailedLabel',
    fallback: 'Analysis failed',
  },
  workingTreeReconciliationFailedMessage: {
    key: 'code.workingTreeReconciliationFailedMessage',
    fallback: 'The file is saved, but the authoritative project analysis could not be refreshed.',
  },
  workingTreePersistedStaleLabel: {
    key: 'code.workingTreePersistedStaleLabel',
    fallback: 'Stale analysis',
  },
  workingTreePersistedStaleMessage: {
    key: 'code.workingTreePersistedStaleMessage',
    fallback: 'The file is saved; the Canvas still shows the last valid project graph.',
  },
  workingTreePersistedInvalidLabel: {
    key: 'code.workingTreePersistedInvalidLabel',
    fallback: 'Invalid project',
  },
  workingTreePersistedInvalidMessage: {
    key: 'code.workingTreePersistedInvalidMessage',
    fallback: 'The file is saved; fix the project diagnostics before preview.',
  },
  workingTreePersistedUnavailableLabel: {
    key: 'code.workingTreePersistedUnavailableLabel',
    fallback: 'Analysis unavailable',
  },
  workingTreePersistedUnavailableMessage: {
    key: 'code.workingTreePersistedUnavailableMessage',
    fallback: 'The file is saved; authoritative project analysis is unavailable.',
  },
  workingTreePersistedVerificationUnavailableLabel: {
    key: 'code.workingTreePersistedVerificationUnavailableLabel',
    fallback: 'Verification unavailable',
  },
  workingTreePersistedVerificationUnavailableMessage: {
    key: 'code.workingTreePersistedVerificationUnavailableMessage',
    fallback: 'The file is saved, but its final authoritative revision could not be verified.',
  },
  workingTreePersistedSupersededLabel: {
    key: 'code.workingTreePersistedSupersededLabel',
    fallback: 'Newer revision available',
  },
  workingTreePersistedSupersededMessage: {
    key: 'code.workingTreePersistedSupersededMessage',
    fallback: 'A newer authoritative revision replaced the saved file. Reload before editing.',
  },
  workingTreeReadOnlyLabel: { key: 'code.workingTreeReadOnlyLabel', fallback: 'Read only' },
  workingTreeReadOnlyMessage: {
    key: 'code.workingTreeReadOnlyMessage',
    fallback: 'This file cannot be changed.',
  },
  workingTreeRetryLabel: { key: 'code.workingTreeRetryLabel', fallback: 'Retry' },
  workingTreeReloadLabel: { key: 'code.workingTreeReloadLabel', fallback: 'Reload file' },
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
  historyTitle: { key: 'code.historyTitle', fallback: 'File history' },
  historyNoFile: { key: 'code.historyNoFile', fallback: 'Select a file to inspect history.' },
  historyLoadingMessage: {
    key: 'code.historyLoadingMessage',
    fallback: 'Loading file history...',
  },
  historyEmptyMessage: {
    key: 'code.historyEmptyMessage',
    fallback: 'No commits found for this file.',
  },
  historyErrorMessage: {
    key: 'code.historyErrorMessage',
    fallback: 'File history could not be loaded right now.',
  },
  historyOpenDiffLabel: { key: 'code.historyOpenDiffLabel', fallback: 'Open in Diff' },
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
  title: 'Código',
  subtitle: 'Explora archivos del workspace y edita el árbol de trabajo en Monaco.',
  explorerTitle: 'Explorador',
  editorLoadingMessage: 'Cargando editor Monaco...',
  editorAriaLabelPrefix: 'Editando',
  workingTreeSynchronizedLabel: 'Sincronizado',
  workingTreeSynchronizedMessage: 'El árbol de trabajo coincide con el editor.',
  workingTreeModifiedLabel: 'Modificado',
  workingTreeModifiedMessage: 'Los cambios esperan sincronización.',
  workingTreeSyncingLabel: 'Sincronizando',
  workingTreeSyncingMessage: 'Actualizando el árbol de trabajo.',
  workingTreeReconcilingLabel: 'Analizando',
  workingTreeReconcilingMessage:
    'El archivo está guardado; actualizando el análisis autoritativo del proyecto.',
  workingTreeConflictLabel: 'Conflicto',
  workingTreeConflictMessage: 'Recarga la revisión más reciente antes de continuar.',
  workingTreeFailedLabel: 'Actualización fallida',
  workingTreeFailedMessage: 'No se pudo actualizar el árbol de trabajo.',
  workingTreeReconciliationFailedLabel: 'Análisis fallido',
  workingTreeReconciliationFailedMessage:
    'El archivo está guardado, pero no se pudo actualizar el análisis autoritativo del proyecto.',
  workingTreePersistedStaleLabel: 'Análisis obsoleto',
  workingTreePersistedStaleMessage:
    'El archivo está guardado; el Canvas todavía muestra el último grafo válido del proyecto.',
  workingTreePersistedInvalidLabel: 'Proyecto no válido',
  workingTreePersistedInvalidMessage:
    'El archivo está guardado; corrige los diagnósticos del proyecto antes del preview.',
  workingTreePersistedUnavailableLabel: 'Análisis no disponible',
  workingTreePersistedUnavailableMessage:
    'El archivo está guardado; el análisis autoritativo del proyecto no está disponible.',
  workingTreePersistedVerificationUnavailableLabel: 'Verificación no disponible',
  workingTreePersistedVerificationUnavailableMessage:
    'El archivo está guardado, pero no se pudo verificar su revisión autoritativa final.',
  workingTreePersistedSupersededLabel: 'Hay una revisión más reciente',
  workingTreePersistedSupersededMessage:
    'Una revisión autoritativa más reciente sustituyó el archivo guardado. Recárgalo antes de editar.',
  workingTreeReadOnlyLabel: 'Solo lectura',
  workingTreeReadOnlyMessage: 'Este archivo no se puede modificar.',
  workingTreeRetryLabel: 'Reintentar',
  workingTreeReloadLabel: 'Recargar archivo',
  routeLoadingMessage: 'Cargando archivos del workspace...',
  routeEmptyTitle: 'No hay archivos del workspace disponibles',
  routeEmptyMessage: 'Este workspace todavía no expone archivos para explorar.',
  routeErrorTitle: 'Archivos del workspace no disponibles',
  routeErrorMessage: 'No se pudo cargar el explorador de archivos ahora.',
  previewLoadingMessage: 'Cargando vista previa del archivo...',
  previewEmptyTitle: 'Selecciona un archivo para previsualizar',
  previewEmptyMessage: 'Elige un archivo del explorador para inspeccionar su contenido.',
  previewErrorTitle: 'Vista previa de archivo no disponible',
  previewErrorMessage: 'No se pudo cargar el archivo seleccionado ahora.',
  previewMissingTitle: 'Archivo seleccionado no disponible',
  previewMissingMessagePrefix: 'El archivo seleccionado ya no está disponible en este workspace:',
  historyTitle: 'Historial de archivo',
  historyNoFile: 'Selecciona un archivo para inspeccionar su historial.',
  historyLoadingMessage: 'Cargando historial del archivo...',
  historyEmptyMessage: 'No se encontraron commits para este archivo.',
  historyErrorMessage: 'No se pudo cargar el historial del archivo ahora.',
  historyOpenDiffLabel: 'Abrir en Diff',
  bootstrapLoadingFilesDetail: 'Cargando archivos del workspace para la ruta de código',
  bootstrapNoWorkspaceFilesDetail: 'La ruta de código está lista sin archivos del workspace',
  bootstrapLoadingPreviewDetail: 'Cargando la vista previa inicial del archivo',
  bootstrapReadyDetail: 'La ruta de código está lista',
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
