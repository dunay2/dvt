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
      }
    : {
        action: 'Create structured field',
        name: 'Field name',
        preview: 'Preview',
        cancel: 'Cancel',
        apply: 'Apply',
        conflict: 'A field with that name already exists',
      };
}
