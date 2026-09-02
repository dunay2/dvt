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
  durationLabel: string;
  costLabel: string;
  testsLabel: string;
  testStatusLabels: Readonly<Record<string, string>>;
  healthTitleTemplate: string;
  healthAriaLabelTemplate: string;
  remainingColumnsLabelTemplate: string;
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
  columnOutputValue: string;
  columnAvailableInputValue: string;
  columnOutputAriaLabelTemplate: string;
  columnAvailableInputAriaLabelTemplate: string;
  columnFunctionCategoryLabels: Readonly<
    Record<'text' | 'numeric' | 'date-time' | 'conversion' | 'aggregate' | 'window', string>
  >;
  noCompatibleColumnFunctionsLabel: string;
  columnFunctionAliasLabelTemplate: string;
  columnFunctionAliasSubmitLabel: string;
  columnFunctionAliasCancelLabel: string;
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
  durationLabel: 'Duration',
  costLabel: 'Cost',
  testsLabel: 'Tests',
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
  columnFunctionAliasLabelTemplate: 'Output alias after {function}',
  columnFunctionAliasSubmitLabel: 'Create output',
  columnFunctionAliasCancelLabel: 'Cancel',
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
  durationLabel: 'Duración',
  costLabel: 'Coste',
  testsLabel: 'Pruebas',
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
  columnFunctionAliasLabelTemplate: 'Alias de salida tras {function}',
  columnFunctionAliasSubmitLabel: 'Crear salida',
  columnFunctionAliasCancelLabel: 'Cancelar',
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
