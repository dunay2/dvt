import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewRouteCopyEs = {
  routeLoadingTitle: 'Cargando canvas',
  routeLoadingMessage:
    'Cargando los datos del grafo del workspace para la superficie principal de authoring.',
  backendLoadingTitle: 'Comprobando disponibilidad del backend',
  backendLoadingMessage:
    'Canvas espera a que terminen las comprobaciones de disponibilidad del backend antes de cargar la superficie de authoring.',
  routeEmptyTitle: 'No hay contenido de grafo cargado',
  routeEmptyEditableMessage:
    'Este workspace todavia no expone nodos de grafo. Usa Add data para importar fuentes o carga contenido de grafo antes de planificar.',
  routeEmptyReadOnlyMessage:
    'Este workspace todavia no expone nodos de grafo. La edicion del grafo esta deshabilitada en este contexto.',
  routeErrorTitle: 'Canvas no disponible',
  routeErrorFallbackMessage: 'No se ha podido cargar el grafo del workspace para Canvas.',
  routeErrorMessage:
    'Canvas no ha podido cargar el grafo actual del workspace. Reintenta cuando el servicio del workspace vuelva a estar disponible.',
  backendBlockedTitle: 'Backend no preparado',
  backendBlockedFallbackMessage:
    'Canvas permanece bloqueado hasta que se recupere la disponibilidad del backend en modo API.',
  mutationUnavailableMessage: 'La edicion del grafo no esta disponible en este contexto.',
  readOnlyTitle: 'Canvas en solo lectura',
  readOnlyMessage:
    'Aqui puedes inspeccionar el grafo y los overlays, pero la planificacion, el arranque de runs y la edicion del grafo estan deshabilitados en este contexto.',
  limitedAccessTitle: 'Acceso de mutacion limitado',
  readOnlyNote:
    'La inspeccion del grafo y los overlays siguen disponibles mientras la mutacion este restringida.',
  draftAccessDeniedTitle: 'Acceso al draft denegado',
  draftAccessDeniedMessage:
    'Canvas no puede leer el draft persistido para el scope actual del workspace.',
  draftUnsupportedSchemaTitle: 'El formato del draft persistido no es compatible',
  draftUnsupportedSchemaMessage:
    'Canvas no puede cargar el draft persistido porque su version de esquema almacenada todavia no es compatible con esta ruta.',
  draftCorruptPayloadTitle: 'El payload del draft persistido esta corrupto',
  draftCorruptPayloadMessage:
    'Canvas no puede cargar el draft persistido porque el payload almacenado esta corrupto y falla el contrato gobernado.',
  draftMigrationFailedTitle: 'La migracion del draft persistido ha fallado',
  draftMigrationFailedMessage:
    'Canvas no puede cargar el draft persistido porque ha fallado su migracion gobernada al formato activo.',
  staleDraftTitle: 'Version de draft obsoleta',
  staleDraftMessage:
    'Se guardo un draft mas reciente en otro sitio. Recarga el draft mas reciente antes de continuar editando.',
  draftProjectionGapTitle: 'El draft persistido va por delante del snapshot actual del grafo',
  draftProjectionGapMessage:
    'Canvas ha pausado la edicion porque el grafo actual del workspace todavia no puede representar todo el draft persistido. Recarga el draft mas reciente o adopta el snapshot actual del workspace antes de continuar.',
  missingRemoteDraftTitle: 'El draft persistido ya no existe',
  missingRemoteDraftMessage:
    'Canvas ha pausado la edicion del draft porque el draft persistido ha desaparecido. Adopta el snapshot actual del workspace antes de continuar.',
  reloadLatestDraftLabel: 'Recargar ultimo draft',
  adoptCurrentWorkspaceSnapshotLabel: 'Adoptar snapshot actual del workspace',
} satisfies Partial<CanvasViewCopy>;
