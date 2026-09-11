/** Owned concern: centralize localized GraphNodeCard copy consumed by card read-model strategies. */
type GraphNodeCardCopy = Readonly<{
  columnsLabel: string;
  rowsLabel: string;
  sizeLabel: string;
  notCalculatedLabel: string;
  estimatedSizeLabel: string;
  freshnessLabel: string;
  lastRefreshLabel: string;
  cadenceLabel: string;
  cadenceValueTemplate: string;
  throughputLabel: string;
  schemaDriftLabel: string;
  noDriftDetectedLabel: string;
  driftDetectedLabel: string;
  allocatedSizeLabel: string;
  minimumSizeLabel: string;
  estimatedPayloadSizeLabel: string;
  datasetSizeLabel: string;
  observedLabel: string;
  estimatedAverageRowSizeLabel: string;
  averageRowSizeLabel: string;
  lastRunLabel: string;
  notConfiguredLabel: string;
  durationLabel: string;
  costLabel: string;
  testsLabel: string;
  readyStatusLabel: string;
  draftStatusLabel: string;
  filterLabel: string;
  testStatusLabels: Readonly<Record<string, string>>;
  healthTitleTemplate: string;
  healthAriaLabelTemplate: string;
  remainingColumnsLabelTemplate: string;
  compactRemainingColumnsLabelTemplate: string;
  compactCollapseColumnsLabel: string;
  showFirstFiveColumnsLabel: string;
  automapColumnsLabel: string;
  sourceColumnPortLabelTemplate: string;
  targetColumnPortLabelTemplate: string;
  columnTypeLabel: string;
  columnNullabilityLabel: string;
  columnNotNullValue: string;
  columnNullableValue: string;
  columnOriginLabel: string;
  columnReferenceLabel: string;
  columnLineageLabel: string;
  columnCommentLabel: string;
  columnOutputValue: string;
  columnAvailableInputValue: string;
  columnOutputAriaLabelTemplate: string;
  columnAvailableInputAriaLabelTemplate: string;
  columnFunctionCategoryLabels: Readonly<
    Record<'text' | 'numeric' | 'date-time' | 'conversion' | 'aggregate' | 'window', string>
  >;
  noCompatibleColumnFunctionsLabel: string;
  noColumnActionsLabel: string;
  columnActionsLabelTemplate: string;
  appendColumnLabelTemplate: string;
  removeStructuredFieldLabel: string;
  columnFunctionAliasLabelTemplate: string;
  columnFunctionAliasSubmitLabel: string;
  columnFunctionAliasCancelLabel: string;
  columnFunctionAliasConflictLabel: string;
  columnFunctionAliasPolicyErrorLabel: string;
  expressionComposerTitle: string;
  expressionComposerFunctionLabel: string;
  expressionComposerOperandsLabel: string;
  expressionComposerOperandLabelTemplate: string;
  expressionComposerAddOperandLabel: string;
  expressionComposerRemoveOperandLabelTemplate: string;
  expressionComposerMoveOperandUpLabelTemplate: string;
  expressionComposerMoveOperandDownLabelTemplate: string;
  expressionComposerPreviewLabel: string;
  expressionComposerRejectedLabel: string;
  addCalculatedColumnLabel: string;
  calculatedColumnKindLabel: string;
  calculatedColumnAliasLabel: string;
  calculatedColumnValueLabel: string;
  calculatedColumnInputLabel: string;
  calculatedColumnFunctionLabel: string;
  calculatedColumnOrderLabel: string;
  calculatedColumnSubmitLabel: string;
  calculatedColumnCancelLabel: string;
  calculatedColumnIdentifierPolicyError: string;
  calculatedColumnLiteralPolicyError: string;
  calculatedColumnTimestampPolicyError: string;
  calculatedColumnKindLabels: Readonly<
    Record<
      'field-ref' | 'string-literal' | 'timestamp-literal' | 'scalar-function' | 'row-number',
      string
    >
  >;
  sourceIdentityAriaLabelTemplate: string;
  sourceIdentityDatabaseLabel: string;
  sourceIdentityConnectionLabel: string;
  sourceIdentitySchemaLabel: string;
  sourceIdentityUserLabel: string;
}>;

const ENGLISH_GRAPH_NODE_CARD_COPY: GraphNodeCardCopy = {
  columnsLabel: 'Columns',
  rowsLabel: 'Rows',
  sizeLabel: 'Size',
  notCalculatedLabel: 'Not calculated',
  estimatedSizeLabel: 'Est. size',
  freshnessLabel: 'Freshness',
  lastRefreshLabel: 'Last refresh',
  cadenceLabel: 'Cadence',
  cadenceValueTemplate: 'Every {minutes} min',
  throughputLabel: 'Throughput',
  schemaDriftLabel: 'Schema drift',
  noDriftDetectedLabel: 'No drift detected',
  driftDetectedLabel: 'Drift detected',
  allocatedSizeLabel: 'Allocated size',
  minimumSizeLabel: 'Minimum size',
  estimatedPayloadSizeLabel: 'Estimated payload size',
  datasetSizeLabel: 'Dataset size',
  observedLabel: 'Observed',
  estimatedAverageRowSizeLabel: 'Est. avg row size',
  averageRowSizeLabel: 'Avg row size',
  lastRunLabel: 'Last run',
  notConfiguredLabel: 'Not configured',
  durationLabel: 'Duration',
  costLabel: 'Cost',
  testsLabel: 'Tests',
  readyStatusLabel: 'Ready',
  draftStatusLabel: 'Draft',
  filterLabel: 'Filter',
  testStatusLabels: {
    pass: 'Passed',
    passed: 'Passed',
    success: 'Passed',
    succeeded: 'Passed',
    fail: 'Failed',
    failed: 'Failed',
    error: 'Failed',
    running: 'Running',
    skip: 'Skipped',
    skipped: 'Skipped',
    warn: 'Warning',
    warning: 'Warning',
  },
  healthTitleTemplate: '{title} health',
  healthAriaLabelTemplate: 'Open {title} health metrics',
  remainingColumnsLabelTemplate: 'Show remaining columns ({count})',
  compactRemainingColumnsLabelTemplate: '+{count} more',
  compactCollapseColumnsLabel: 'Show less',
  showFirstFiveColumnsLabel: 'Show first 5 columns',
  automapColumnsLabel: 'Map compatible columns',
  sourceColumnPortLabelTemplate: 'Connect {column} output',
  targetColumnPortLabelTemplate: 'Map into {column}',
  columnTypeLabel: 'Type',
  columnNullabilityLabel: 'Nullability',
  columnNotNullValue: 'Not null',
  columnNullableValue: 'Nullable',
  columnOriginLabel: 'Origin',
  columnReferenceLabel: 'Reference',
  columnLineageLabel: 'Transformation lineage',
  columnCommentLabel: 'Comment',
  columnOutputValue: 'Included in output',
  columnAvailableInputValue: 'Available input',
  columnOutputAriaLabelTemplate: '{column}, included in output',
  columnAvailableInputAriaLabelTemplate: '{column}, available input',
  columnFunctionCategoryLabels: {
    text: 'Text functions',
    numeric: 'Numeric functions',
    'date-time': 'Date and time functions',
    conversion: 'Conversion functions',
    aggregate: 'Aggregate functions',
    window: 'Window functions',
  },
  noCompatibleColumnFunctionsLabel: 'No functions are compatible with this type and target.',
  noColumnActionsLabel: 'No actions are available for this column.',
  columnActionsLabelTemplate: 'Actions for {column}',
  appendColumnLabelTemplate: 'Add {column}',
  removeStructuredFieldLabel: 'Remove grouping',
  columnFunctionAliasLabelTemplate: 'Output alias after {function}',
  columnFunctionAliasSubmitLabel: 'Create output',
  columnFunctionAliasCancelLabel: 'Cancel',
  columnFunctionAliasConflictLabel: 'Another column already uses this output name.',
  columnFunctionAliasPolicyErrorLabel:
    'Use a valid PostgreSQL identifier without outer whitespace and with at most 63 UTF-8 bytes.',
  expressionComposerTitle: 'Create derived output',
  expressionComposerFunctionLabel: 'Function',
  expressionComposerOperandsLabel: 'Ordered operands',
  expressionComposerOperandLabelTemplate: 'Operand {index}',
  expressionComposerAddOperandLabel: 'Add operand',
  expressionComposerRemoveOperandLabelTemplate: 'Remove operand {index}',
  expressionComposerMoveOperandUpLabelTemplate: 'Move operand {index} up',
  expressionComposerMoveOperandDownLabelTemplate: 'Move operand {index} down',
  expressionComposerPreviewLabel: 'Preview',
  expressionComposerRejectedLabel: 'The output could not be created. Review the expression.',
  addCalculatedColumnLabel: 'Add calculated column',
  calculatedColumnKindLabel: 'Value source',
  calculatedColumnAliasLabel: 'Output name',
  calculatedColumnValueLabel: 'Value',
  calculatedColumnInputLabel: 'Input column',
  calculatedColumnFunctionLabel: 'Function',
  calculatedColumnOrderLabel: 'Order by',
  calculatedColumnSubmitLabel: 'Create column',
  calculatedColumnCancelLabel: 'Cancel',
  calculatedColumnIdentifierPolicyError:
    'Use a valid PostgreSQL identifier without outer whitespace and with at most 63 UTF-8 bytes.',
  calculatedColumnLiteralPolicyError: 'Text values may contain at most 4096 UTF-8 bytes.',
  calculatedColumnTimestampPolicyError:
    'Use a canonical UTC timestamp such as 2026-09-08T12:00:00.000Z.',
  calculatedColumnKindLabels: {
    'field-ref': 'Alias column',
    'string-literal': 'Text value',
    'timestamp-literal': 'Timestamp with timezone',
    'scalar-function': 'Column function',
    'row-number': 'Ordered row number',
  },
  sourceIdentityAriaLabelTemplate: 'View source identity for {table}',
  sourceIdentityDatabaseLabel: 'Database',
  sourceIdentityConnectionLabel: 'Connection',
  sourceIdentitySchemaLabel: 'Schema',
  sourceIdentityUserLabel: 'User',
};

const SPANISH_GRAPH_NODE_CARD_COPY: GraphNodeCardCopy = {
  columnsLabel: 'Columnas',
  rowsLabel: 'Filas',
  sizeLabel: 'Tamaño',
  notCalculatedLabel: 'No calculado',
  estimatedSizeLabel: 'Tamaño estimado',
  freshnessLabel: 'Actualización',
  lastRefreshLabel: 'Última actualización',
  cadenceLabel: 'Frecuencia',
  cadenceValueTemplate: 'Cada {minutes} min',
  throughputLabel: 'Rendimiento',
  schemaDriftLabel: 'Cambios de esquema',
  noDriftDetectedLabel: 'Sin cambios detectados',
  driftDetectedLabel: 'Cambios detectados',
  allocatedSizeLabel: 'Tamaño asignado',
  minimumSizeLabel: 'Tamaño mínimo',
  estimatedPayloadSizeLabel: 'Tamaño estimado de datos',
  datasetSizeLabel: 'Tamaño del conjunto',
  observedLabel: 'Observado',
  estimatedAverageRowSizeLabel: 'Tamaño medio estimado por fila',
  averageRowSizeLabel: 'Tamaño medio por fila',
  lastRunLabel: 'Última ejecución',
  notConfiguredLabel: 'Sin configurar',
  durationLabel: 'Duración',
  costLabel: 'Coste',
  testsLabel: 'Pruebas',
  readyStatusLabel: 'Listo',
  draftStatusLabel: 'Borrador',
  filterLabel: 'Filtro',
  testStatusLabels: {
    pass: 'Aprobadas',
    passed: 'Aprobadas',
    success: 'Aprobadas',
    succeeded: 'Aprobadas',
    fail: 'Fallidas',
    failed: 'Fallidas',
    error: 'Fallidas',
    running: 'En curso',
    skip: 'Omitidas',
    skipped: 'Omitidas',
    warn: 'Con avisos',
    warning: 'Con avisos',
  },
  healthTitleTemplate: 'Estado de {title}',
  healthAriaLabelTemplate: 'Abrir métricas de estado de {title}',
  remainingColumnsLabelTemplate: 'Ver columnas restantes ({count})',
  compactRemainingColumnsLabelTemplate: '+{count} más',
  compactCollapseColumnsLabel: 'Ver menos',
  showFirstFiveColumnsLabel: 'Mostrar solo las 5 primeras',
  automapColumnsLabel: 'Asignar columnas compatibles',
  sourceColumnPortLabelTemplate: 'Conectar salida de {column}',
  targetColumnPortLabelTemplate: 'Asignar a {column}',
  columnTypeLabel: 'Tipo',
  columnNullabilityLabel: 'Nulabilidad',
  columnNotNullValue: 'No nulo',
  columnNullableValue: 'Admite nulos',
  columnOriginLabel: 'Origen',
  columnReferenceLabel: 'Referencia',
  columnLineageLabel: 'Linaje de transformación',
  columnCommentLabel: 'Comentario',
  columnOutputValue: 'Incluida en salida',
  columnAvailableInputValue: 'Entrada disponible',
  columnOutputAriaLabelTemplate: '{column}, incluida en salida',
  columnAvailableInputAriaLabelTemplate: '{column}, entrada disponible',
  columnFunctionCategoryLabels: {
    text: 'Funciones de texto',
    numeric: 'Funciones numéricas',
    'date-time': 'Funciones de fecha y hora',
    conversion: 'Funciones de conversión',
    aggregate: 'Funciones de agregación',
    window: 'Funciones de ventana',
  },
  noCompatibleColumnFunctionsLabel: 'No hay funciones compatibles con este tipo y destino.',
  noColumnActionsLabel: 'No hay acciones disponibles para esta columna.',
  columnActionsLabelTemplate: 'Acciones de {column}',
  appendColumnLabelTemplate: 'Añadir {column}',
  removeStructuredFieldLabel: 'Eliminar agrupación',
  columnFunctionAliasLabelTemplate: 'Alias de salida tras {function}',
  columnFunctionAliasSubmitLabel: 'Crear salida',
  columnFunctionAliasCancelLabel: 'Cancelar',
  columnFunctionAliasConflictLabel: 'Otra columna ya utiliza este nombre de salida.',
  columnFunctionAliasPolicyErrorLabel:
    'Usa un identificador PostgreSQL válido, sin espacios exteriores y con 63 bytes UTF-8 como máximo.',
  expressionComposerTitle: 'Crear salida derivada',
  expressionComposerFunctionLabel: 'Función',
  expressionComposerOperandsLabel: 'Operandos ordenados',
  expressionComposerOperandLabelTemplate: 'Operando {index}',
  expressionComposerAddOperandLabel: 'Añadir operando',
  expressionComposerRemoveOperandLabelTemplate: 'Quitar operando {index}',
  expressionComposerMoveOperandUpLabelTemplate: 'Subir operando {index}',
  expressionComposerMoveOperandDownLabelTemplate: 'Bajar operando {index}',
  expressionComposerPreviewLabel: 'Vista previa',
  expressionComposerRejectedLabel: 'No se pudo crear la salida. Revisa la expresión.',
  addCalculatedColumnLabel: 'Añadir columna calculada',
  calculatedColumnKindLabel: 'Origen del valor',
  calculatedColumnAliasLabel: 'Nombre de salida',
  calculatedColumnValueLabel: 'Valor',
  calculatedColumnInputLabel: 'Columna de entrada',
  calculatedColumnFunctionLabel: 'Función',
  calculatedColumnOrderLabel: 'Ordenar por',
  calculatedColumnSubmitLabel: 'Crear columna',
  calculatedColumnCancelLabel: 'Cancelar',
  calculatedColumnIdentifierPolicyError:
    'Usa un identificador PostgreSQL válido, sin espacios exteriores y con 63 bytes UTF-8 como máximo.',
  calculatedColumnLiteralPolicyError: 'Los valores de texto admiten 4096 bytes UTF-8 como máximo.',
  calculatedColumnTimestampPolicyError: 'Usa una fecha UTC canonica como 2026-09-08T12:00:00.000Z.',
  calculatedColumnKindLabels: {
    'field-ref': 'Alias de columna',
    'string-literal': 'Valor de texto',
    'timestamp-literal': 'Timestamp con zona',
    'scalar-function': 'Función de columna',
    'row-number': 'Número de fila ordenado',
  },
  sourceIdentityAriaLabelTemplate: 'Ver identidad de origen de {table}',
  sourceIdentityDatabaseLabel: 'Base de datos',
  sourceIdentityConnectionLabel: 'Conexión',
  sourceIdentitySchemaLabel: 'Esquema',
  sourceIdentityUserLabel: 'Usuario',
};

export function resolveGraphNodeCardCopy(locale?: string): GraphNodeCardCopy {
  return locale?.trim().toLowerCase().startsWith('es')
    ? SPANISH_GRAPH_NODE_CARD_COPY
    : ENGLISH_GRAPH_NODE_CARD_COPY;
}
