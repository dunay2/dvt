import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewExecutionCopyEs = {
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
} satisfies Partial<CanvasViewCopy>;
