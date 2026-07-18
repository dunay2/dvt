/** Owned concern: resolve locale-aware copy for the dbt YAML description editor. */
import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';
import { detectCanvasViewLocale } from '../../views/canvas/canvasCopyCatalog';

export type DbtYamlDescriptionEditorCopy = Readonly<{
  title: string;
  fieldLabel: string;
  fieldHint: string;
  emptyPlaceholder: string;
  fileLabel: string;
  characterCountLabel: string;
  reviewAction: string;
  reviewingAction: string;
  discardReviewAction: string;
  applyAction: string;
  applyingAction: string;
  revertAction: string;
  revertingAction: string;
  continueAction: string;
  reloadAction: string;
  reloadingAction: string;
  reviewTitle: string;
  reviewMessage: string;
  diffLabel: string;
  appliedTitle: string;
  appliedMessage: string;
  revertedTitle: string;
  revertedMessage: string;
  noChangesMessage: string;
  refreshFailedMessage: string;
  revisionConflictMessage: string;
  proposalConflictMessage: string;
  idempotencyConflictMessage: string;
  resourceUnavailableMessage: string;
  resourceUnsupportedMessage: string;
  documentInvalidMessage: string;
  unauthorizedMessage: string;
  forbiddenMessage: string;
  networkMessage: string;
  unknownFailureMessage: string;
}>;

const COPY_BY_KEY: Record<keyof DbtYamlDescriptionEditorCopy, LocalizableString> = {
  title: { key: 'dbtDescription.title', fallback: 'Description' },
  fieldLabel: { key: 'dbtDescription.fieldLabel', fallback: 'Resource description' },
  fieldHint: {
    key: 'dbtDescription.fieldHint',
    fallback: 'Changes are proposed against the authoritative dbt YAML file before they apply.',
  },
  emptyPlaceholder: {
    key: 'dbtDescription.emptyPlaceholder',
    fallback: 'Describe the purpose, grain, and intended use of this resource.',
  },
  fileLabel: { key: 'dbtDescription.fileLabel', fallback: 'YAML file' },
  characterCountLabel: { key: 'dbtDescription.characterCountLabel', fallback: 'characters' },
  reviewAction: { key: 'dbtDescription.reviewAction', fallback: 'Review changes' },
  reviewingAction: { key: 'dbtDescription.reviewingAction', fallback: 'Building review' },
  discardReviewAction: { key: 'dbtDescription.discardReviewAction', fallback: 'Back to edit' },
  applyAction: { key: 'dbtDescription.applyAction', fallback: 'Apply change' },
  applyingAction: { key: 'dbtDescription.applyingAction', fallback: 'Applying' },
  revertAction: { key: 'dbtDescription.revertAction', fallback: 'Revert change' },
  revertingAction: { key: 'dbtDescription.revertingAction', fallback: 'Reverting' },
  continueAction: { key: 'dbtDescription.continueAction', fallback: 'Continue editing' },
  reloadAction: { key: 'dbtDescription.reloadAction', fallback: 'Reload latest' },
  reloadingAction: { key: 'dbtDescription.reloadingAction', fallback: 'Reloading' },
  reviewTitle: { key: 'dbtDescription.reviewTitle', fallback: 'Review YAML change' },
  reviewMessage: {
    key: 'dbtDescription.reviewMessage',
    fallback: 'Confirm the focused diff before changing the project working tree.',
  },
  diffLabel: { key: 'dbtDescription.diffLabel', fallback: 'Proposed YAML diff' },
  appliedTitle: { key: 'dbtDescription.appliedTitle', fallback: 'Description updated' },
  appliedMessage: {
    key: 'dbtDescription.appliedMessage',
    fallback: 'The file changed conditionally and the dbt project was analyzed again.',
  },
  revertedTitle: { key: 'dbtDescription.revertedTitle', fallback: 'Change reverted' },
  revertedMessage: {
    key: 'dbtDescription.revertedMessage',
    fallback: 'The previous description was restored without overwriting a later revision.',
  },
  noChangesMessage: {
    key: 'dbtDescription.noChangesMessage',
    fallback: 'Edit the description to prepare a review.',
  },
  refreshFailedMessage: {
    key: 'dbtDescription.refreshFailedMessage',
    fallback: 'The file changed, but the refreshed project graph could not be loaded.',
  },
  revisionConflictMessage: {
    key: 'dbtDescription.revisionConflictMessage',
    fallback: 'The YAML file changed after this review. Reload the latest revision.',
  },
  proposalConflictMessage: {
    key: 'dbtDescription.proposalConflictMessage',
    fallback: 'The proposed change no longer matches the authoritative YAML content.',
  },
  idempotencyConflictMessage: {
    key: 'dbtDescription.idempotencyConflictMessage',
    fallback: 'This command identity was reused for different content. Start a new review.',
  },
  resourceUnavailableMessage: {
    key: 'dbtDescription.resourceUnavailableMessage',
    fallback: 'The selected dbt resource no longer exists in the current project analysis.',
  },
  resourceUnsupportedMessage: {
    key: 'dbtDescription.resourceUnsupportedMessage',
    fallback: 'This resource does not have an authoritative YAML description target.',
  },
  documentInvalidMessage: {
    key: 'dbtDescription.documentInvalidMessage',
    fallback: 'The authoritative YAML document is invalid and cannot be changed visually.',
  },
  unauthorizedMessage: {
    key: 'dbtDescription.unauthorizedMessage',
    fallback: 'Your API session expired. Sign in again before changing the project.',
  },
  forbiddenMessage: {
    key: 'dbtDescription.forbiddenMessage',
    fallback: 'Your workspace role cannot change this dbt project file.',
  },
  networkMessage: {
    key: 'dbtDescription.networkMessage',
    fallback: 'The API could not be reached. Check the coordinated stack and retry.',
  },
  unknownFailureMessage: {
    key: 'dbtDescription.unknownFailureMessage',
    fallback: 'The dbt description operation failed without a usable diagnostic.',
  },
};

const SPANISH_COPY: DbtYamlDescriptionEditorCopy = {
  title: 'Descripcion',
  fieldLabel: 'Descripcion del recurso',
  fieldHint:
    'Los cambios se proponen contra el archivo YAML autoritativo de dbt antes de aplicarse.',
  emptyPlaceholder: 'Describe el proposito, el grano y el uso previsto de este recurso.',
  fileLabel: 'Archivo YAML',
  characterCountLabel: 'caracteres',
  reviewAction: 'Revisar cambios',
  reviewingAction: 'Preparando revision',
  discardReviewAction: 'Volver a editar',
  applyAction: 'Aplicar cambio',
  applyingAction: 'Aplicando',
  revertAction: 'Revertir cambio',
  revertingAction: 'Revirtiendo',
  continueAction: 'Seguir editando',
  reloadAction: 'Recargar ultima revision',
  reloadingAction: 'Recargando',
  reviewTitle: 'Revisar cambio YAML',
  reviewMessage: 'Confirma el diff acotado antes de cambiar el arbol de trabajo del proyecto.',
  diffLabel: 'Diff YAML propuesto',
  appliedTitle: 'Descripcion actualizada',
  appliedMessage: 'El archivo cambio de forma condicional y el proyecto dbt se analizo de nuevo.',
  revertedTitle: 'Cambio revertido',
  revertedMessage: 'Se restauro la descripcion anterior sin sobrescribir una revision posterior.',
  noChangesMessage: 'Edita la descripcion para preparar una revision.',
  refreshFailedMessage:
    'El archivo cambio, pero no se pudo cargar el grafo actualizado del proyecto.',
  revisionConflictMessage:
    'El archivo YAML cambio despues de esta revision. Recarga la ultima revision.',
  proposalConflictMessage: 'El cambio propuesto ya no coincide con el contenido YAML autoritativo.',
  idempotencyConflictMessage:
    'Esta identidad de comando se reutilizo para otro contenido. Inicia una nueva revision.',
  resourceUnavailableMessage:
    'El recurso dbt seleccionado ya no existe en el analisis actual del proyecto.',
  resourceUnsupportedMessage:
    'Este recurso no tiene un destino YAML autoritativo para su descripcion.',
  documentInvalidMessage:
    'El documento YAML autoritativo no es valido y no se puede cambiar visualmente.',
  unauthorizedMessage: 'Tu sesion de API ha caducado. Inicia sesion antes de cambiar el proyecto.',
  forbiddenMessage: 'Tu rol del workspace no puede cambiar este archivo del proyecto dbt.',
  networkMessage: 'No se pudo alcanzar la API. Comprueba el stack coordinado y reintenta.',
  unknownFailureMessage: 'La operacion de descripcion dbt fallo sin un diagnostico util.',
};

export function resolveDbtYamlDescriptionEditorCopy(
  locale: string = detectCanvasViewLocale()
): DbtYamlDescriptionEditorCopy {
  if (locale.trim().toLowerCase().startsWith('es')) {
    return SPANISH_COPY;
  }

  return Object.fromEntries(
    Object.entries(COPY_BY_KEY).map(([key, value]) => [key, resolveString(value, locale)])
  ) as DbtYamlDescriptionEditorCopy;
}
