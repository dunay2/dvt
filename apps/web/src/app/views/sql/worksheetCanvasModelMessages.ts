/** Canvas conversion messages describe the actual proposal and publication outcomes. */
export const worksheetCanvasModelMessages = {
  en: {
    name: 'Model name',
    prepare: 'Prepare Canvas Model',
    confirm: 'Confirm Canvas Model',
    retry: 'Retry confirmation',
    busy: 'Working…',
    confirmation: 'Confirm this Model and its input relationships in the current Canvas.',
    columns: 'Proposed columns',
    context: 'Select a PostgreSQL connection and an editable Canvas before preparing a Model.',
    stale: 'The worksheet, Canvas or workspace changed. Prepare a new proposal before confirming.',
    denied: 'You do not have permission to create this Canvas Model.',
    unavailable:
      'The SQL or its inputs could not be represented as a Canvas Model. Check its relations, columns and supported SQL operations.',
    contract: 'The proposal could not be verified. Nothing was saved.',
    invalid: 'This SQL cannot produce a complete Canvas Model.',
    created: 'Created Canvas Model',
    conflict: 'The Canvas changed before this save. Refresh it and prepare a new proposal.',
    unknown:
      'The save could not be confirmed. Retry this same confirmation to recover its outcome before creating another Model.',
    authority: 'This destination no longer has editable Canvas authority.',
    unsupported: 'The current Canvas format could not be saved.',
  },
  es: {
    name: 'Nombre del modelo',
    prepare: 'Preparar modelo de Canvas',
    confirm: 'Confirmar modelo de Canvas',
    retry: 'Reintentar confirmación',
    busy: 'Procesando…',
    confirmation: 'Confirma este modelo y sus relaciones de entrada en el Canvas actual.',
    columns: 'Columnas propuestas',
    context: 'Selecciona una conexión PostgreSQL y un Canvas editable antes de preparar un modelo.',
    stale:
      'La consulta, el Canvas o el espacio de trabajo cambiaron. Prepara otra propuesta antes de confirmar.',
    denied: 'No tienes permiso para crear este modelo de Canvas.',
    unavailable:
      'No se pudo representar el SQL o sus entradas como modelo de Canvas. Revisa las relaciones, columnas y operaciones SQL admitidas.',
    contract: 'No se pudo verificar la propuesta. No se guardó ningún cambio.',
    invalid: 'Este SQL no puede producir un modelo de Canvas completo.',
    created: 'Modelo de Canvas creado',
    conflict: 'El Canvas cambió antes de guardar. Actualízalo y prepara otra propuesta.',
    unknown:
      'No se pudo confirmar el guardado. Reintenta esta misma confirmación para recuperar su resultado antes de crear otro modelo.',
    authority: 'Este destino ya no tiene autoridad editable de Canvas.',
    unsupported: 'No se pudo guardar el formato actual de Canvas.',
  },
} as const;
