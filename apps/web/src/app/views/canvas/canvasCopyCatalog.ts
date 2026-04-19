import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy, CanvasViewLanguage } from './canvasCopy.types';

const COPY_BY_KEY: Record<keyof CanvasViewCopy, LocalizableString> = {
  routeLoadingTitle: {
    key: 'canvas.route.loadingTitle',
    fallback: 'Loading canvas',
  },
  routeLoadingMessage: {
    key: 'canvas.route.loadingMessage',
    fallback: 'Loading workspace graph data for the main authoring surface.',
  },
  backendLoadingTitle: {
    key: 'canvas.backend.loadingTitle',
    fallback: 'Checking backend readiness',
  },
  backendLoadingMessage: {
    key: 'canvas.backend.loadingMessage',
    fallback:
      'Canvas is waiting for the backend readiness checks to settle before loading the authoring surface.',
  },
  routeEmptyTitle: {
    key: 'canvas.route.emptyTitle',
    fallback: 'No graph content loaded',
  },
  routeEmptyEditableMessage: {
    key: 'canvas.route.emptyEditableMessage',
    fallback:
      'This workspace does not expose graph nodes yet. Use Add data to import sources or load graph content before planning.',
  },
  routeEmptyReadOnlyMessage: {
    key: 'canvas.route.emptyReadOnlyMessage',
    fallback:
      'This workspace does not expose graph nodes yet. Graph edits are disabled in this context.',
  },
  routeErrorTitle: {
    key: 'canvas.route.errorTitle',
    fallback: 'Canvas unavailable',
  },
  routeErrorFallbackMessage: {
    key: 'canvas.route.errorFallbackMessage',
    fallback: 'The workspace graph could not be loaded for Canvas.',
  },
  routeErrorMessage: {
    key: 'canvas.route.errorMessage',
    fallback:
      'Canvas could not load the current workspace graph. Retry after the workspace service is available again.',
  },
  backendBlockedTitle: {
    key: 'canvas.backend.blockedTitle',
    fallback: 'Backend not ready',
  },
  backendBlockedFallbackMessage: {
    key: 'canvas.backend.blockedFallbackMessage',
    fallback: 'Canvas stays blocked until backend readiness is restored in API mode.',
  },
  mutationUnavailableMessage: {
    key: 'canvas.mutation.unavailableMessage',
    fallback: 'Graph edits are unavailable in this context.',
  },
  readOnlyTitle: {
    key: 'canvas.readOnly.title',
    fallback: 'Read-only canvas',
  },
  readOnlyMessage: {
    key: 'canvas.readOnly.message',
    fallback:
      'Inspect the graph and overlays here, but planning, run start, and graph edits are disabled in this context.',
  },
  limitedAccessTitle: {
    key: 'canvas.readOnly.limitedAccessTitle',
    fallback: 'Limited mutation access',
  },
  readOnlyNote: {
    key: 'canvas.readOnly.note',
    fallback: 'Graph inspection and overlays remain available while mutation is gated.',
  },
  staleDraftTitle: {
    key: 'canvas.draft.staleTitle',
    fallback: 'Stale draft version',
  },
  staleDraftMessage: {
    key: 'canvas.draft.staleMessage',
    fallback: 'A newer draft was saved elsewhere. Reload the latest draft before continuing edits.',
  },
  draftProjectionGapTitle: {
    key: 'canvas.draft.projectionGapTitle',
    fallback: 'Persisted draft is ahead of the current graph snapshot',
  },
  draftProjectionGapMessage: {
    key: 'canvas.draft.projectionGapMessage',
    fallback:
      'Canvas has paused editing because the current workspace graph cannot represent the full persisted draft yet. Reload the latest draft or adopt the current workspace snapshot before continuing.',
  },
  missingRemoteDraftTitle: {
    key: 'canvas.draft.missingRemoteTitle',
    fallback: 'Persisted draft no longer exists',
  },
  missingRemoteDraftMessage: {
    key: 'canvas.draft.missingRemoteMessage',
    fallback:
      'Canvas has paused draft editing because the persisted draft disappeared. Adopt the current workspace snapshot before continuing.',
  },
  reloadLatestDraftLabel: {
    key: 'canvas.draft.reloadLatestLabel',
    fallback: 'Reload latest draft',
  },
  adoptCurrentWorkspaceSnapshotLabel: {
    key: 'canvas.draft.adoptSnapshotLabel',
    fallback: 'Adopt current workspace snapshot',
  },
  dependencyAddedMessage: {
    key: 'canvas.edge.dependencyAddedMessage',
    fallback: 'Dependency added',
  },
  layoutAppliedMessage: {
    key: 'canvas.layout.appliedMessage',
    fallback: 'Layout applied',
  },
  toolbarWorkflowRecoveryLabel: {
    key: 'canvas.toolbar.workflow.recoveryLabel',
    fallback: 'Recovery',
  },
  toolbarWorkflowReadOnlyLabel: {
    key: 'canvas.toolbar.workflow.readOnlyLabel',
    fallback: 'Read only',
  },
  toolbarWorkflowRunReadyLabel: {
    key: 'canvas.toolbar.workflow.runReadyLabel',
    fallback: 'Run ready',
  },
  toolbarWorkflowPlanRequiredLabel: {
    key: 'canvas.toolbar.workflow.planRequiredLabel',
    fallback: 'Plan required',
  },
  toolbarLayoutLabel: {
    key: 'canvas.toolbar.layoutLabel',
    fallback: 'Layout',
  },
  toolbarImpactLabel: {
    key: 'canvas.toolbar.impactLabel',
    fallback: 'Impact',
  },
  toolbarColumnsLabel: {
    key: 'canvas.toolbar.columnsLabel',
    fallback: 'Columns',
  },
  toolbarCostLabel: {
    key: 'canvas.toolbar.costLabel',
    fallback: 'Cost',
  },
  toolbarPlanLabel: {
    key: 'canvas.toolbar.planLabel',
    fallback: 'Plan',
  },
  toolbarRunLabel: {
    key: 'canvas.toolbar.runLabel',
    fallback: 'Run',
  },
  draftSyncedLabel: {
    key: 'canvas.draft.toolbar.syncedLabel',
    fallback: 'Draft synced',
  },
  savingDraftLabel: {
    key: 'canvas.draft.toolbar.savingLabel',
    fallback: 'Saving draft',
  },
  draftSavedLabel: {
    key: 'canvas.draft.toolbar.savedLabel',
    fallback: 'Draft saved',
  },
  staleVersionLabel: {
    key: 'canvas.draft.toolbar.staleVersionLabel',
    fallback: 'Stale version',
  },
  draftMissingLabel: {
    key: 'canvas.draft.toolbar.missingLabel',
    fallback: 'Draft missing',
  },
  projectionGapLabel: {
    key: 'canvas.draft.toolbar.projectionGapLabel',
    fallback: 'Projection gap',
  },
  preparingCanvasRouteDetail: {
    key: 'canvas.bootstrap.preparingDetail',
    fallback: 'Preparing canvas route',
  },
  checkingBackendReadinessDetail: {
    key: 'canvas.bootstrap.checkingBackendDetail',
    fallback: 'Checking backend readiness for canvas',
  },
  loadingWorkspaceGraphDetail: {
    key: 'canvas.bootstrap.loadingGraphDetail',
    fallback: 'Loading workspace graph for canvas',
  },
  emptyCanvasReadyDetail: {
    key: 'canvas.bootstrap.emptyReadyDetail',
    fallback: 'Canvas is ready with no graph content yet',
  },
  canvasReadyDetail: {
    key: 'canvas.bootstrap.readyDetail',
    fallback: 'Canvas is ready',
  },
  connectionIncompleteMessage: {
    key: 'canvas.connection.incompleteMessage',
    fallback: 'Connection is incomplete.',
  },
  nodeNotFoundInGraphMessage: {
    key: 'canvas.connection.nodeNotFoundMessage',
    fallback: 'Node not found in graph.',
  },
  nodeAlreadyOnCanvasMessage: {
    key: 'canvas.node.alreadyOnCanvasMessage',
    fallback: 'Node already on canvas',
  },
  transformationConnectionOrderMessage: {
    key: 'canvas.transformation.connectionOrderMessage',
    fallback: 'Plan edges must follow source -> sql_transform -> sink.',
  },
  transformationConnectionEdgeCountMessage: {
    key: 'canvas.transformation.connectionEdgeCountMessage',
    fallback:
      'Plan requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
  },
  transformationConnectionDuplicateMessage: {
    key: 'canvas.transformation.connectionDuplicateMessage',
    fallback: 'Dependency already exists in this transformation draft.',
  },
  planPermissionDeniedMessage: {
    key: 'canvas.plan.permissionDeniedMessage',
    fallback: 'You do not have permission to create plans',
  },
  planSqlArtifactRequiredMessage: {
    key: 'canvas.plan.sqlArtifactRequiredMessage',
    fallback:
      'Preview provenance must resolve the SQL artifact before creating a persisted plan.',
  },
  planUnableToCreateMessage: {
    key: 'canvas.plan.unableToCreateMessage',
    fallback: 'Unable to create execution plan',
  },
  previewProvenanceTransformPathRequiredMessage: {
    key: 'canvas.preview.transformPathRequiredMessage',
    fallback:
      'Preview provenance requires one SQL transform node with a workspace file path before planning.',
  },
  previewProvenanceWorkspaceNotConfiguredMessage: {
    key: 'canvas.preview.workspaceNotConfiguredMessage',
    fallback:
      'Preview provenance is not configured for this workspace. Set the Git repo and graph artifact path before planning.',
  },
  previewProvenanceExplicitGitRevisionRequiredMessage: {
    key: 'canvas.preview.explicitGitRevisionRequiredMessage',
    fallback: 'Preview provenance requires an explicit Git branch and commit before planning.',
  },
  previewProvenanceWorkspaceFilesUnavailableMessage: {
    key: 'canvas.preview.workspaceFilesUnavailableMessage',
    fallback: 'Preview provenance could not be resolved from the workspace files.',
  },
  runPermissionDeniedMessage: {
    key: 'canvas.run.permissionDeniedMessage',
    fallback: 'You do not have permission to start runs',
  },
  runNoPlanMessage: {
    key: 'canvas.run.noPlanMessage',
    fallback: 'No execution plan available - run Plan first',
  },
  runPreviewStaleMessage: {
    key: 'canvas.run.previewStaleMessage',
    fallback: 'Preview is stale. Re-run Plan before starting.',
  },
  runPlanRefUnavailableMessage: {
    key: 'canvas.run.planRefUnavailableMessage',
    fallback: 'Plan reference is unavailable for this mode',
  },
  runPersistedPreviewRequiredMessage: {
    key: 'canvas.run.persistedPreviewRequiredMessage',
    fallback:
      'Run start requires a persisted preview plan bound to the current plan reference. Re-run Plan first.',
  },
  runFailedMessage: {
    key: 'canvas.run.failedMessage',
    fallback: 'Failed to start run',
  },
  planCreatedMessage: {
    key: 'canvas.plan.createdMessage',
    fallback: 'Execution plan created',
  },
  runStartedMessage: {
    key: 'canvas.run.startedMessage',
    fallback: 'Run started',
  },
  planStatusRunUnavailableMessage: {
    key: 'canvas.planStatus.runUnavailableMessage',
    fallback: 'Run start is unavailable in this context.',
  },
  planStatusPreviewRequiredMessage: {
    key: 'canvas.planStatus.previewRequiredMessage',
    fallback: 'Preview required before running.',
  },
  planStatusPreviewNotAlignedMessage: {
    key: 'canvas.planStatus.previewNotAlignedMessage',
    fallback: 'Preview is not aligned with the active plan reference. Re-run Plan before starting.',
  },
  planStatusPreviewNotPersistedMessage: {
    key: 'canvas.planStatus.previewNotPersistedMessage',
    fallback: 'Preview is not persisted. Re-run Plan to create a persisted plan.',
  },
  planStatusPreviewReadyMessage: {
    key: 'canvas.planStatus.previewReadyMessage',
    fallback: 'Preview is current and ready to run.',
  },
  transformationRequiresThreeNodesMessage: {
    key: 'canvas.transformation.requiresThreeNodesMessage',
    fallback: 'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
  },
  transformationUnsupportedRolesMessage: {
    key: 'canvas.transformation.unsupportedRolesMessage',
    fallback: 'Plan supports only input, transform, and output nodes in this vertical.',
  },
  transformationRequiresOneOfEachRoleMessage: {
    key: 'canvas.transformation.requiresOneOfEachRoleMessage',
    fallback: 'Plan requires exactly 1 source, 1 sql_transform, and 1 sink.',
  },
  transformationDraftValidMessage: {
    key: 'canvas.transformation.validMessage',
    fallback: 'Transformation draft is valid for preview.',
  },
  connectionSelfNotAllowedMessage: {
    key: 'canvas.connection.selfNotAllowedMessage',
    fallback: 'Self-connections are not allowed.',
  },
  connectionAlreadyExistsMessage: {
    key: 'canvas.connection.alreadyExistsMessage',
    fallback: 'Connection already exists.',
  },
  connectionCycleDetectedMessage: {
    key: 'canvas.connection.cycleDetectedMessage',
    fallback: 'Would create a cycle in the DAG.',
  },
  connectionPluginRuleBlockedFallbackMessage: {
    key: 'canvas.connection.pluginRuleBlockedFallbackMessage',
    fallback: 'Connection is not permitted by plugin rules.',
  },
  connectionCrossPluginBridgeMissingPrefix: {
    key: 'canvas.connection.crossPluginBridgeMissingPrefix',
    fallback: 'No compatible data port bridge between',
  },
  limitedAccessMessagePrefix: {
    key: 'canvas.readOnly.limitedAccessMessagePrefix',
    fallback: 'You can keep inspecting the graph, but ',
  },
  limitedAccessSingularMessageSuffix: {
    key: 'canvas.readOnly.limitedAccessSingularMessageSuffix',
    fallback: ' is unavailable in this context.',
  },
  limitedAccessPluralMessageSuffix: {
    key: 'canvas.readOnly.limitedAccessPluralMessageSuffix',
    fallback: ' are unavailable in this context.',
  },
  capabilityPlanPreview: {
    key: 'canvas.readOnly.capabilityPlanPreview',
    fallback: 'plan preview',
  },
  capabilityRunStart: {
    key: 'canvas.readOnly.capabilityRunStart',
    fallback: 'run start',
  },
  capabilityGraphEdits: {
    key: 'canvas.readOnly.capabilityGraphEdits',
    fallback: 'graph edits',
  },
  conjunctionAnd: {
    key: 'canvas.list.conjunctionAnd',
    fallback: 'and',
  },
  serialConjunctionAnd: {
    key: 'canvas.list.serialConjunctionAnd',
    fallback: 'and',
  },
  nodeAddedPrefix: {
    key: 'canvas.node.addedPrefix',
    fallback: 'Added',
  },
  nodeAddedSuffix: {
    key: 'canvas.node.addedSuffix',
    fallback: 'to canvas',
  },
  nodeRemovedPrefix: {
    key: 'canvas.node.removedPrefix',
    fallback: 'Removed',
  },
  nodeRemovedSuffix: {
    key: 'canvas.node.removedSuffix',
    fallback: '',
  },
};

const LOCALIZED_COPY_BY_LANGUAGE: Record<CanvasViewLanguage, CanvasViewCopy | null> = {
  en: null,
  es: {
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
    routeErrorFallbackMessage:
      'No se ha podido cargar el grafo del workspace para Canvas.',
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
    dependencyAddedMessage: 'Dependencia anadida',
    layoutAppliedMessage: 'Layout aplicado',
    toolbarWorkflowRecoveryLabel: 'Recuperacion',
    toolbarWorkflowReadOnlyLabel: 'Solo lectura',
    toolbarWorkflowRunReadyLabel: 'Run listo',
    toolbarWorkflowPlanRequiredLabel: 'Plan requerido',
    toolbarLayoutLabel: 'Layout',
    toolbarImpactLabel: 'Impacto',
    toolbarColumnsLabel: 'Columnas',
    toolbarCostLabel: 'Coste',
    toolbarPlanLabel: 'Plan',
    toolbarRunLabel: 'Run',
    draftSyncedLabel: 'Draft sincronizado',
    savingDraftLabel: 'Guardando draft',
    draftSavedLabel: 'Draft guardado',
    staleVersionLabel: 'Version obsoleta',
    draftMissingLabel: 'Draft ausente',
    projectionGapLabel: 'Hueco de proyeccion',
    preparingCanvasRouteDetail: 'Preparando la ruta de canvas',
    checkingBackendReadinessDetail: 'Comprobando la disponibilidad del backend para canvas',
    loadingWorkspaceGraphDetail: 'Cargando el grafo del workspace para canvas',
    emptyCanvasReadyDetail: 'Canvas esta listo aunque todavia no haya contenido de grafo',
    canvasReadyDetail: 'Canvas esta listo',
    connectionIncompleteMessage: 'La conexion esta incompleta.',
    nodeNotFoundInGraphMessage: 'No se ha encontrado el nodo en el grafo.',
    nodeAlreadyOnCanvasMessage: 'El nodo ya esta en el canvas',
    transformationConnectionOrderMessage:
      'Las aristas del plan deben seguir source -> sql_transform -> sink.',
    transformationConnectionEdgeCountMessage:
      'El plan requiere exactamente 2 aristas: source -> sql_transform y sql_transform -> sink.',
    transformationConnectionDuplicateMessage:
      'La dependencia ya existe en este draft de transformacion.',
    planPermissionDeniedMessage: 'No tienes permisos para crear planes',
    planSqlArtifactRequiredMessage:
      'La provenance del preview debe resolver el artefacto SQL antes de crear un plan persistido.',
    planUnableToCreateMessage: 'No se ha podido crear el plan de ejecucion',
    previewProvenanceTransformPathRequiredMessage:
      'La provenance del preview requiere un nodo SQL transform con una ruta de fichero del workspace antes de planificar.',
    previewProvenanceWorkspaceNotConfiguredMessage:
      'La provenance del preview no esta configurada para este workspace. Define el repo Git y la ruta del artefacto de grafo antes de planificar.',
    previewProvenanceExplicitGitRevisionRequiredMessage:
      'La provenance del preview requiere una rama y un commit Git explicitos antes de planificar.',
    previewProvenanceWorkspaceFilesUnavailableMessage:
      'No se ha podido resolver la provenance del preview a partir de los ficheros del workspace.',
    runPermissionDeniedMessage: 'No tienes permisos para arrancar runs',
    runNoPlanMessage: 'No hay un plan de ejecucion disponible: ejecuta Plan antes',
    runPreviewStaleMessage: 'El preview esta obsoleto. Ejecuta Plan otra vez antes de arrancar.',
    runPlanRefUnavailableMessage: 'La referencia del plan no esta disponible para este modo',
    runPersistedPreviewRequiredMessage:
      'El arranque del run requiere un plan de preview persistido y vinculado a la referencia de plan actual. Ejecuta Plan otra vez primero.',
    runFailedMessage: 'No se ha podido arrancar el run',
    planCreatedMessage: 'Plan de ejecucion creado',
    runStartedMessage: 'Run arrancado',
    planStatusRunUnavailableMessage: 'El arranque de runs no esta disponible en este contexto.',
    planStatusPreviewRequiredMessage: 'Se requiere un preview antes de arrancar.',
    planStatusPreviewNotAlignedMessage:
      'El preview no esta alineado con la referencia de plan activa. Ejecuta Plan otra vez antes de arrancar.',
    planStatusPreviewNotPersistedMessage:
      'El preview no esta persistido. Ejecuta Plan para crear un plan persistido.',
    planStatusPreviewReadyMessage: 'El preview actual esta listo para arrancar.',
    transformationRequiresThreeNodesMessage:
      'El plan requiere exactamente 3 nodos: source, sql_transform y sink.',
    transformationUnsupportedRolesMessage:
      'El plan solo admite nodos input, transform y output en esta vertical.',
    transformationRequiresOneOfEachRoleMessage:
      'El plan requiere exactamente 1 source, 1 sql_transform y 1 sink.',
    transformationDraftValidMessage: 'El draft de transformacion es valido para preview.',
    connectionSelfNotAllowedMessage: 'No se permiten las autoconexiones.',
    connectionAlreadyExistsMessage: 'La conexion ya existe.',
    connectionCycleDetectedMessage: 'La conexion crearia un ciclo en el DAG.',
    connectionPluginRuleBlockedFallbackMessage:
      'La conexion no esta permitida por las reglas del plugin.',
    connectionCrossPluginBridgeMissingPrefix:
      'No existe un puente de puertos de datos compatible entre',
    limitedAccessMessagePrefix: 'Puedes seguir inspeccionando el grafo, pero ',
    limitedAccessSingularMessageSuffix: ' no esta disponible en este contexto.',
    limitedAccessPluralMessageSuffix: ' no estan disponibles en este contexto.',
    capabilityPlanPreview: 'el preview del plan',
    capabilityRunStart: 'el arranque de runs',
    capabilityGraphEdits: 'la edicion del grafo',
    conjunctionAnd: 'y',
    serialConjunctionAnd: 'y',
    nodeAddedPrefix: 'Se ha anadido',
    nodeAddedSuffix: 'al canvas',
    nodeRemovedPrefix: 'Se ha eliminado',
    nodeRemovedSuffix: '',
  },
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
