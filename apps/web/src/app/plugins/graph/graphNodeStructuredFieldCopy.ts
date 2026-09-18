/** Owned concern: localize structured-field composition UI. */
export function resolveGraphNodeStructuredFieldCopy(language: string) {
  return language === 'es'
    ? {
        action: 'Crear campo estructurado',
        name: 'Nombre del campo',
        preview: 'Vista previa',
        cancel: 'Cancelar',
        apply: 'Aplicar',
        conflict: 'Ya existe un campo con ese nombre',
        invalid:
          'Usa un identificador PostgreSQL válido, sin espacios exteriores y con 63 bytes UTF-8 como máximo.',
        staleFields: 'Los campos seleccionados ya no están disponibles. Revisa la propuesta.',
        rejected: 'No se pudo crear la agrupación. Revisa la propuesta.',
        childActions: 'Acciones de {column}',
        moveUp: 'Mover arriba',
        moveDown: 'Mover abajo',
        unavailable: 'No hay acciones disponibles para esta columna.',
      }
    : {
        action: 'Create structured field',
        name: 'Field name',
        preview: 'Preview',
        cancel: 'Cancel',
        apply: 'Apply',
        conflict: 'A field with that name already exists',
        invalid:
          'Use a valid PostgreSQL identifier without outer whitespace and with at most 63 UTF-8 bytes.',
        staleFields: 'The selected fields are no longer available. Review the proposal.',
        rejected: 'The grouping could not be created. Review the proposal.',
        childActions: 'Actions for {column}',
        moveUp: 'Move up',
        moveDown: 'Move down',
        unavailable: 'No actions are available for this column.',
      };
}
