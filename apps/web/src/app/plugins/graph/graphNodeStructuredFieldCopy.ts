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
        childActions: 'Actions for {column}',
        moveUp: 'Move up',
        moveDown: 'Move down',
        unavailable: 'No actions are available for this column.',
      };
}
