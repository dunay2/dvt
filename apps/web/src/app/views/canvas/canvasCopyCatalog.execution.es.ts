import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewExecutionCopyEs = {
  planPermissionDeniedMessage: 'No tienes permisos para crear Execution Previews',
  planSqlArtifactRequiredMessage:
    'La provenance del preview debe resolver el artefacto SQL antes de crear un Execution Preview persistido.',
  planUnableToCreateMessage: 'No se ha podido crear el Execution Preview',
  planGraphModelSqlDivergenceMessageTemplate:
    'Código de proyecto contiene una edición más reciente en {path}. El Preview se ha detenido sin sobrescribirla. Continúa desde un proyecto DBT con autoridad de archivos o restaura la revisión generada por el Canvas.',
  planGraphAuthorityRefusedMessage:
    'La previsualización se detuvo porque este Canvas no tiene autoridad graph-draft exclusiva. Abre el proyecto con autoridad de ficheros o resuelve el conflicto de autoridad del Canvas.',
  previewProvenanceTransformPathRequiredMessage:
    'Execution Preview necesita contenido SQL. Selecciona un fichero SQL del workspace para el SQL transform o usa un transform creado en el canvas para que DVT lo cree.',
  previewProvenanceWorkspaceNotConfiguredMessage:
    'La provenance del preview no esta configurada para este workspace. Define el repo Git y la ruta del artefacto de grafo antes de planificar.',
  previewProvenanceExplicitGitRevisionRequiredMessage:
    'La provenance del preview requiere una rama y un commit Git explicitos antes de planificar.',
  previewProvenanceWorkspaceFilesUnavailableMessage:
    'No se ha podido resolver la provenance del preview a partir de los ficheros del workspace.',
  runPermissionDeniedMessage: 'No tienes permisos para arrancar runs',
  runNoPlanMessage: 'No hay un Execution Preview disponible: previsualiza la ejecucion antes.',
  runPreviewStaleMessage:
    'Execution Preview esta obsoleto. Previsualiza la ejecucion otra vez antes de arrancar.',
  runPlanRefUnavailableMessage:
    'La referencia del Execution Preview no esta disponible para este modo',
  runPersistedPreviewRequiredMessage:
    'El arranque del run requiere un Execution Preview persistido y vinculado a la referencia de Execution Preview actual. Previsualiza la ejecucion otra vez primero.',
  runFailedMessage: 'No se ha podido arrancar el run',
  canvasExecutionUnavailableMessage:
    'Execution Preview y el arranque de run no estan disponibles para este tipo de canvas.',
  dbtExplicitSelectionRequiresExecutableResourceMessage:
    'La seleccion contiene recursos no disponibles o no ejecutables. Resuelve la seleccion explicita en Operaciones antes del Preview.',
  planCreatedMessage: 'Execution Preview creado',
  runStartedMessage: 'Run arrancado',
  planStatusRunUnavailableMessage: 'El arranque de runs no esta disponible en este contexto.',
  planStatusPreviewRequiredMessage: 'Se requiere un preview antes de arrancar.',
  planStatusPreviewNotAlignedMessage:
    'Execution Preview no esta alineado con la referencia de Execution Preview activa. Previsualiza la ejecucion otra vez antes de arrancar.',
  planStatusPreviewNotPersistedMessage:
    'Execution Preview no esta persistido. Previsualiza la ejecucion para crear un preview persistido.',
  planStatusPreviewReadyMessage: 'El preview actual esta listo para arrancar.',
  selectionRecoveryTitle: 'Selección de ejecución',
  selectionRecoveryReadyStatus: 'lista',
  selectionRecoveryBlockedStatus: 'bloqueada',
  selectionRecoveryRequestedRootsLabel: 'Raíces solicitadas',
  selectionRecoveryUnavailableRootsLabel: 'Raíces no disponibles',
  selectionRecoveryNonExecutableRootsLabel: 'Raíces no ejecutables',
  selectionRecoveryDerivedDependenciesLabel: 'Dependencias derivadas',
  selectionRecoveryAdmittedScopeLabel: 'Alcance admitido',
  selectionRecoveryLastPreviewRevisionLabel: 'Última revisión del preview',
  selectionRecoveryEmptyValue: 'Ninguno',
  selectionRecoveryDiscardUnavailableAction: 'Descartar selección no disponible',
  selectionRecoveryUseWorkspaceScopeAction: 'Usar alcance del workspace',
  selectionRecoveryRefreshAnalysisAction: 'Mantener bloqueo y actualizar análisis',
  selectionRecoveryRefreshingAnalysisAction: 'Actualizando análisis autoritativo...',
  selectionRecoveryRefreshFailureMessage: 'No se pudo actualizar el análisis autoritativo.',
  selectionRecoveryProblemSummary: 'La selección de ejecución requiere recuperación.',
  selectionRecoveryProblemDetail:
    'Las raíces solicitadas no disponibles o no ejecutables deben resolverse antes del Preview.',
  selectionRecoveryBlockerLabel: 'Selección de ejecución',
  selectionRecoveryDiscardReceiptTemplate:
    'Raíces no disponibles descartadas: {affected}. Raíces explícitas conservadas: {retained}.',
  selectionRecoveryWorkspaceReceiptTemplate:
    'Raíces explícitas reemplazadas: {affected} por el alcance del workspace.',
  selectionRecoveryRefreshReceiptTemplate:
    'Raíces solicitadas conservadas: {retained}. Análisis autoritativo actualizado.',
} satisfies Partial<CanvasViewCopy>;
