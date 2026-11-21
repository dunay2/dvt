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
  copyRange: 'Copy range',
  backgroundColor: 'Data grid background color',
  columns: 'Show or hide columns',
  showColumn: 'Show {column}',
  allColumnsHidden: 'All columns are hidden',
  columnType: 'Type: {type}',
  filterColumn: 'Filter {column}',
  filterPriority: 'Filter {priority}',
  sortPriority: 'Sort priority {priority}, {direction}',
  ascending: 'ascending',
  descending: 'descending',
  copied: 'Cell copied',
  copyFailed: 'Could not copy the cell',
  copiedRange: 'Range copied',
  copyRangeFailed: 'Could not copy the range',
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
    copyRange: 'Copiar rango',
    backgroundColor: 'Color de fondo de Datos',
    columns: 'Mostrar u ocultar columnas',
    showColumn: 'Mostrar {column}',
    allColumnsHidden: 'Todas las columnas están ocultas',
    columnType: 'Tipo: {type}',
    filterColumn: 'Filtrar {column}',
    filterPriority: 'Filtro {priority}',
    sortPriority: 'Prioridad de orden {priority}, {direction}',
    ascending: 'ascendente',
    descending: 'descendente',
    copied: 'Celda copiada',
    copyFailed: 'No se pudo copiar la celda',
    copiedRange: 'Rango copiado',
    copyRangeFailed: 'No se pudo copiar el rango',
    noMatches: 'Sin coincidencias en esta muestra',
    rowNumber: 'Número de fila',
    emptyText: 'Texto vacío',
    columnHint:
      'Pulsa para ordenar las filas cargadas. Arrastra o usa Alt+Flecha izquierda/derecha para mover la columna.',
  },
};
