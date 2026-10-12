/**
 * Owned concern: localize bounded grid interactions without defining data semantics.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Name the loaded sample explicitly in both languages.
 * @consequence Local filtering and sorting cannot imply a whole-dataset query.
 * @version 1.0.0
 */
const en = {
  search: 'Search loaded rows',
  scope: 'Search and sort apply only to loaded rows',
  count: '{visible} / {total} loaded rows',
  comfortable: 'Comfortable rows',
  compact: 'Compact rows',
  wrap: 'Wrap text',
  copy: 'Copy cell',
  copied: 'Cell copied',
  copyFailed: 'Could not copy the cell',
  noMatches: 'No matching rows in this sample',
  rowNumber: 'Row number',
  emptyText: 'Empty text',
  columnHint: 'Click to sort loaded rows. Drag or use Alt+ArrowLeft/Right to move the column.',
};

export type OperationalDrawerDataTableCopy = typeof en;
export const operationalDrawerDataTableCopy: Record<'en' | 'es', OperationalDrawerDataTableCopy> = {
  en,
  es: {
    search: 'Buscar en las filas cargadas',
    scope: 'La búsqueda y el orden se aplican sólo a las filas cargadas',
    count: '{visible} / {total} filas cargadas',
    comfortable: 'Filas cómodas',
    compact: 'Filas compactas',
    wrap: 'Ajustar texto',
    copy: 'Copiar celda',
    copied: 'Celda copiada',
    copyFailed: 'No se pudo copiar la celda',
    noMatches: 'Sin coincidencias en esta muestra',
    rowNumber: 'Número de fila',
    emptyText: 'Texto vacío',
    columnHint:
      'Pulsa para ordenar las filas cargadas. Arrastra o usa Alt+Flecha izquierda/derecha para mover la columna.',
  },
};
