/** Copy for the explicit choice between Canvas authoring and dbt file publication. */
export const sqlConversionMessages = {
  en: {
    title: 'Convert to model',
    destination: 'Destination',
    canvas: 'Active Canvas',
    dbt: 'dbt project file',
    project: 'dbt project',
    chooseProject: 'Choose a project',
    name: 'Model name',
    create: 'Create dbt model',
    busy: 'Creating model…',
    created: 'Created file',
    close: 'Close',
    project_unavailable: 'Select a project with current dbt file authority.',
    conflict:
      'The configuration changed or the model already exists. Refresh the project and check the name.',
    invalid_sql: 'Use a single SELECT without dbt template directives.',
    unavailable: 'The model could not be confirmed. Check the project before retrying.',
  },
  es: {
    title: 'Convertir en modelo',
    destination: 'Destino',
    canvas: 'Canvas activo',
    dbt: 'Archivo de proyecto dbt',
    project: 'Proyecto dbt',
    chooseProject: 'Elegir proyecto',
    name: 'Nombre del modelo',
    create: 'Crear modelo dbt',
    busy: 'Creando modelo…',
    created: 'Archivo creado',
    close: 'Cerrar',
    project_unavailable: 'Elige un proyecto con autoridad vigente sobre sus archivos dbt.',
    conflict:
      'La configuración cambió o el modelo ya existe. Actualiza el proyecto y revisa el nombre.',
    invalid_sql: 'Usa un único SELECT sin directivas de plantilla dbt.',
    unavailable: 'No se pudo confirmar el modelo. Comprueba el proyecto antes de reintentar.',
  },
};
