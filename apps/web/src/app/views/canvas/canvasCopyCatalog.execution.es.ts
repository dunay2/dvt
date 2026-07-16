import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewExecutionCopyEs = {
  planPermissionDeniedMessage: 'No tienes permisos para crear Execution Previews',
  planSqlArtifactRequiredMessage:
    'La provenance del preview debe resolver el artefacto SQL antes de crear un Execution Preview persistido.',
  planUnableToCreateMessage: 'No se ha podido crear el Execution Preview',
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
    'Selecciona al menos un modelo, test o snapshot DBT antes de previsualizar esta seleccion.',
  planCreatedMessage: 'Execution Preview creado',
  runStartedMessage: 'Run arrancado',
  planStatusRunUnavailableMessage: 'El arranque de runs no esta disponible en este contexto.',
  planStatusPreviewRequiredMessage: 'Se requiere un preview antes de arrancar.',
  planStatusPreviewNotAlignedMessage:
    'Execution Preview no esta alineado con la referencia de Execution Preview activa. Previsualiza la ejecucion otra vez antes de arrancar.',
  planStatusPreviewNotPersistedMessage:
    'Execution Preview no esta persistido. Previsualiza la ejecucion para crear un preview persistido.',
  planStatusPreviewReadyMessage: 'El preview actual esta listo para arrancar.',
} satisfies Partial<CanvasViewCopy>;
