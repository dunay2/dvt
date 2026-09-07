import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewRouteCopyEs = {
  routeLoadingTitle: 'Cargando canvas',
  routeLoadingMessage:
    'Cargando los datos del grafo del workspace para la superficie principal de authoring.',
  backendLoadingTitle: 'Comprobando disponibilidad del backend',
  backendLoadingMessage:
    'Canvas espera a que terminen las comprobaciones de disponibilidad del backend antes de cargar la superficie de authoring.',
  canvasViewportContextSurfaceLabel: 'Fondo del grafo del canvas',
  canvasContextMenuLabel: 'Acciones del canvas',
  routeNeedsCanvasTitle: 'Canvas',
  routeNeedsCanvasMessage: 'Añade fuentes y construye tus transformaciones aquí.',
  routeNeedsCanvasActionLabel: 'Empezar Canvas',
  routeNeedsCanvasReadOnlyMessage: 'No tienes permiso para crear el Canvas en este proyecto.',
  routeErrorTitle: 'Canvas no disponible',
  routeErrorFallbackMessage: 'No se ha podido cargar el grafo del workspace para Canvas.',
  routeErrorMessage:
    'Canvas no ha podido cargar el grafo actual del workspace. Reintenta cuando el servicio del workspace vuelva a estar disponible.',
  unsupportedCanvasKindMessagePrefix: 'Canvas no puede abrir el tipo de canvas persistido ',
  unsupportedCanvasKindMessageSuffix: ' porque no hay un registro de runtime disponible.',
  disabledCanvasPluginMessagePrefix: 'Canvas no puede abrir el tipo de canvas persistido ',
  disabledCanvasPluginMessageSuffix: ' porque su plugin esta deshabilitado o no disponible.',
  backendBlockedTitle: 'Backend no preparado',
  backendBlockedFallbackMessage:
    'Canvas permanece bloqueado hasta que se recupere la disponibilidad del backend.',
  mutationUnavailableMessage: 'La edicion del grafo no esta disponible en este contexto.',
  readOnlyTitle: 'Canvas en solo lectura',
  readOnlyMessage:
    'Aqui puedes inspeccionar el grafo y los overlays. Usa un alcance ejecutable del workspace para planificar o ejecutar.',
  limitedAccessTitle: 'Trabajo limitado',
  readOnlyNote: 'Abre un proyecto editable o un alcance de ejecucion para seguir trabajando.',
  readOnlyActionLabel: 'Elegir alcance de ejecucion',
  draftAccessDeniedTitle: 'Acceso al draft denegado',
  draftAccessDeniedMessage:
    'Canvas no puede leer el draft persistido para el scope actual del workspace.',
  sessionRequiredDraftLabel: 'Sesion requerida',
  readOnlyDraftLabel: 'Draft en solo lectura',
  forbiddenScopeDraftLabel: 'Acceso al draft denegado',
  draftFormatBlockedLabel: 'Formato de draft bloqueado',
  refreshSessionActionLabel: 'Refrescar sesion',
  changeScopeActionLabel: 'Cambiar scope',
  inspectOnlyActionLabel: 'Solo inspeccionar',
  escalateFormatActionLabel: 'Escalar problema de formato del draft',
  draftSessionRequiredTitle: 'Sesion requerida para acceder al draft',
  draftSessionRequiredMessage:
    'Canvas no puede leer el draft protegido porque la sesion actual falta o ha expirado. Refresca la sesion.',
  draftForbiddenScopeTitle: 'El scope del draft esta denegado',
  draftForbiddenScopeMessage:
    'Canvas no puede leer este draft del workspace con el tenant, proyecto o permisos actuales. Cambia el scope o solicita acceso.',
  draftReadOnlyTitle: 'El draft esta en solo lectura',
  draftReadOnlyMessage:
    'Canvas puede inspeccionar este draft, pero la edicion del grafo, la planificacion y el arranque de ejecuciones estan deshabilitados para el alcance actual. Elige un alcance ejecutable del workspace para trabajar.',
  draftUnsupportedSchemaTitle: 'El formato del draft persistido no es compatible',
  draftUnsupportedSchemaMessage:
    'Canvas no puede cargar el draft persistido porque su version de esquema almacenada todavia no es compatible con esta ruta.',
  draftCorruptPayloadTitle: 'El payload del draft persistido esta corrupto',
  draftCorruptPayloadMessage:
    'Canvas no puede cargar el draft persistido porque el payload almacenado esta corrupto y falla el contrato gobernado.',
  staleDraftTitle: 'Version de draft obsoleta',
  staleDraftMessage:
    'Se guardo un draft mas reciente en otro sitio. Recarga el draft mas reciente antes de continuar editando.',
  draftProjectionGapTitle:
    'El draft persistido va por delante de la autoridad protegida actual del draft',
  draftProjectionGapMessage:
    'Canvas ha pausado la edicion porque la autoridad protegida actual del draft todavia no puede representar todo el draft persistido. Recarga el ultimo draft cuando la autoridad protegida se ponga al dia.',
  missingRemoteDraftTitle: 'El draft persistido ya no existe',
  missingRemoteDraftMessage:
    'Canvas ha pausado la edicion del draft porque el draft persistido ha desaparecido. Recarga el ultimo draft cuando la autoridad protegida vuelva a estar disponible.',
  reloadLatestDraftLabel: 'Recargar ultimo draft',
} satisfies Partial<CanvasViewCopy>;
