import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewExecutionCopyEs = {
  planPermissionDeniedMessage: 'No tienes permisos para crear planes',
  planSqlArtifactRequiredMessage:
    'La provenance del preview debe resolver el artefacto SQL antes de crear un plan persistido.',
  planUnableToCreateMessage: 'No se ha podido crear el plan de ejecucion',
  previewProvenanceTransformPathRequiredMessage:
    'Execution Preview necesita contenido SQL. Selecciona un fichero SQL del workspace para el SQL transform o usa un transform creado en el canvas para que DVT lo cree.',
  previewProvenanceWorkspaceNotConfiguredMessage:
    'La provenance del preview no esta configurada para este workspace. Define el repo Git y la ruta del artefacto de grafo antes de planificar.',
  previewProvenanceExplicitGitRevisionRequiredMessage:
    'La provenance del preview requiere una rama y un commit Git explicitos antes de planificar.',
  previewProvenanceWorkspaceFilesUnavailableMessage:
    'No se ha podido resolver la provenance del preview a partir de los ficheros del workspace.',
  runPermissionDeniedMessage: 'No tienes permisos para arrancar runs',
  runNoPlanMessage:
    'No hay un plan de ejecucion disponible: previsualiza el plan de ejecucion antes.',
  runPreviewStaleMessage:
    'Execution Preview esta obsoleto. Previsualiza el plan de ejecucion otra vez antes de arrancar.',
  runPlanRefUnavailableMessage: 'La referencia del plan no esta disponible para este modo',
  runPersistedPreviewRequiredMessage:
    'El arranque del run requiere un Execution Preview persistido y vinculado a la referencia de plan actual. Previsualiza el plan de ejecucion otra vez primero.',
  runFailedMessage: 'No se ha podido arrancar el run',
  canvasExecutionUnavailableMessage:
    'El preview de plan y el arranque de run no estan disponibles para este tipo de canvas.',
  planCreatedMessage: 'Plan de ejecucion creado',
  runStartedMessage: 'Run arrancado',
  planStatusRunUnavailableMessage: 'El arranque de runs no esta disponible en este contexto.',
  planStatusPreviewRequiredMessage: 'Se requiere un preview antes de arrancar.',
  planStatusPreviewNotAlignedMessage:
    'Execution Preview no esta alineado con la referencia de plan activa. Previsualiza el plan de ejecucion otra vez antes de arrancar.',
  planStatusPreviewNotPersistedMessage:
    'Execution Preview no esta persistido. Previsualiza el plan de ejecucion para crear un preview persistido.',
  planStatusPreviewReadyMessage: 'El preview actual esta listo para arrancar.',
} satisfies Partial<CanvasViewCopy>;
