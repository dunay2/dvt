/** Owned concern: localized explorer creation labels and safe failure descriptions. */
export const CODE_FILE_CREATION_MESSAGES = {
  en: {
    newFile: 'New file',
    importFile: 'Import file',
    title: 'Add a project file',
    description: 'Choose a path relative to the project. Existing files are never replaced.',
    path: 'File path',
    content: 'Initial content',
    create: 'Create file',
    cancel: 'Cancel',
    close: 'Close',
    saving: 'Creating…',
    reading: 'Reading file…',
    refreshing: 'Refreshing explorer…',
    retry: 'Retry refresh',
    invalidPath: 'Enter a relative file path within this project.',
    conflict: 'A file already exists at this path. Choose another name.',
    forbidden: 'You do not have permission to create files in this workspace.',
    unavailable:
      'The file could not be created. Check the path, file format and connection, then retry.',
    invalidText: 'Choose a UTF-8 text file. The selected file could not be decoded.',
    importTooLarge: 'Choose a text file no larger than 1 MB for import.',
    receiptMismatch:
      'The saved file could not be confirmed. Check the explorer before creating it again.',
    refreshFailed:
      'The file was created, but the explorer could not be refreshed. Retry refresh to open it.',
  },
  es: {
    newFile: 'Nuevo archivo',
    importFile: 'Importar archivo',
    title: 'Añadir un archivo al proyecto',
    description:
      'Elige una ruta relativa al proyecto. Los archivos existentes nunca se sustituyen.',
    path: 'Ruta del archivo',
    content: 'Contenido inicial',
    create: 'Crear archivo',
    cancel: 'Cancelar',
    close: 'Cerrar',
    saving: 'Creando…',
    reading: 'Leyendo archivo…',
    refreshing: 'Actualizando explorador…',
    retry: 'Reintentar actualización',
    invalidPath: 'Introduce una ruta relativa dentro de este proyecto.',
    conflict: 'Ya existe un archivo en esta ruta. Elige otro nombre.',
    forbidden: 'No tienes permiso para crear archivos en este workspace.',
    unavailable:
      'No se pudo crear el archivo. Revisa la ruta, el formato y la conexión antes de reintentar.',
    invalidText: 'Elige un archivo de texto UTF-8. No se pudo decodificar el archivo seleccionado.',
    importTooLarge: 'Elige un archivo de texto de hasta 1 MB para importarlo.',
    receiptMismatch:
      'No se pudo confirmar el archivo guardado. Revisa el explorador antes de volver a crearlo.',
    refreshFailed:
      'El archivo se ha creado, pero no se pudo actualizar el explorador. Reintenta la actualización para abrirlo.',
  },
};
