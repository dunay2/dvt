/** Owned concern: localize Source Import presentation from the application language authority. */
import {
  type ApplicationLanguage,
  useApplicationLanguageStore,
} from '../../stores/applicationLanguageStore';
import type { SourceImportFailure } from './types';

const EN_COPY = {
  title: 'Add source',
  description:
    'Explore governed connections, inspect source objects, and attach supported origins to the canvas.',
  closeAction: 'Close source import',
  sections: {
    ariaLabel: 'Add source sections',
    connections: 'Connections',
    browse: 'Browse',
    metadata: 'Metadata',
    selected: 'Selected',
  },
  footer: {
    doneAction: 'Done',
    cancelAction: 'Cancel',
    attachingAction: 'Attaching...',
    attachAction: 'Attach sources to canvas',
  },
  selectConnectionError: 'Please select a connection',
  selectAtLeastOneObjectError: 'Select at least one importable source object.',
  loadConnectionsError: 'Failed to load warehouse connections.',
  loadSourceObjectsError: 'Failed to load source objects.',
  matchDbtSourceTablesError:
    'This connection does not expose every table declared by the imported dbt sources.',
  importSuccess: 'Sources attached successfully',
  importError: 'Failed to register data objects.',
  connection: {
    title: 'Choose database connection',
    databaseBadge: 'Database',
    description:
      'Choose which database connection should be used to discover candidate data objects',
    loading: 'Loading connections...',
    searchLabel: 'Search governed connections',
    catalogSource: 'Catalog: .dvt/warehouse-connections.json',
    catalogSummarySingular: '{count} connection in governed catalog',
    catalogSummaryPlural: '{count} connections in governed catalog',
    empty: 'No governed database connections found.',
    emptyHint: 'Add database connections to the workspace catalog before importing sources.',
    noMatches: 'No governed connections match the current search.',
    createAction: 'New connection',
    createTitle: 'Register database connection',
    createDescription:
      'Create a governed catalog entry from a server-resolved credential reference.',
    createNameLabel: 'Connection name',
    createTypeLabel: 'Connection type',
    createDatabaseLabel: 'Database',
    createCredentialRefLabel: 'Credential reference',
    createCredentialRefPlaceholder: 'postgres:local-warehouse',
    createSubmitAction: 'Create connection',
    creatingAction: 'Creating...',
    createCancelAction: 'Cancel',
    createValidationError: 'Name, database, and credential reference are required.',
    createCredentialRefError:
      'Use a reference in the format postgres:<alias>. Do not enter the URL or password.',
    createSuccess: 'Warehouse connection created',
    createError: 'Failed to create warehouse connection.',
    renameAction: 'Rename connection',
    renameTitle: 'Rename connection',
    renameNameLabel: 'New connection name',
    renameSubmitAction: 'Save name',
    renamingAction: 'Saving...',
    renameCancelAction: 'Cancel',
    renameValidationError: 'Enter a different connection name.',
    duplicateNameError: 'A connection with that name already exists. Choose another name.',
    renameSuccess: 'Connection name updated',
    renameError: 'Failed to rename the connection.',
    testAction: 'Test connection',
    testingAction: 'Testing...',
    testPassed: 'Connection passed',
    testFailed: 'Connection failed',
    testFailedDetail: 'Check the connection credentials and availability.',
    testError: 'Failed to test warehouse connection.',
    reachableObjects: 'objects reachable',
  },
  selection: {
    title: 'Browse source objects',
    descriptionPrefix: 'Choose supported objects to attach as source nodes. Selected:',
    loading: 'Loading source objects...',
    empty: 'No source objects are available for this connection.',
    searchLabel: 'Search source catalog',
    searchPlaceholder: 'Search name, locator, column, or type',
  },
  metadata: {
    title: 'Selected source metadata',
    description: 'Inspect every selected source object before registering the selection.',
    sharedDatabaseLabel: 'Shared database',
    noObjectSelected: 'No source object selected',
    rowsUnknown: 'Rows unknown',
    sizeUnknown: 'Size unknown',
    noColumns: '0 columns',
    columnsUnavailable: 'Column metadata is not recorded for this selected source object.',
    optionsUnavailable:
      'Import options are unavailable because this source object cannot yet be attached by the relational importer.',
  },
  grouping: {
    title: 'Grouping Strategy',
    description: 'Choose how relational source objects should be grouped in the dbt registry',
    options: {
      schema: {
        label: 'Group by Schema (Recommended)',
        description: 'Creates one source per schema. Example: RAW.ERP.ORDERS -> source(erp)',
        badge: 'Enterprise-friendly',
      },
      database: {
        label: 'Group by Database',
        description: 'Creates one source per database. Best for small projects.',
      },
    },
  },
  options: {
    title: 'Metadata Options',
    description: 'Configure what metadata to include when registering data objects',
    defaultLabel: 'Default',
    enabledShortLabel: 'ON',
    disabledShortLabel: 'OFF',
  },
  review: {
    title: 'Selected sources',
    description: 'Review the selected source objects before attaching them to the canvas.',
    previewTitle: 'Canvas attachment preview',
    connectionLabel: 'Connection:',
    sourceObjectsSelectedLabel: 'Source objects selected:',
    dataObjectGroupsLabel: 'Data object groups:',
    groupingStrategyLabel: 'Grouping strategy:',
    groupingStrategySchemaLabel: 'Schema',
    groupingStrategyDatabaseLabel: 'Database',
    enabledLabel: 'Yes',
    disabledLabel: 'No',
    registryFileLabel: 'Registry file',
    destinationPosture:
      'Destination is configured on a DVT Sink node after origin registration; verify the output target before previewing or running the graph.',
    dataObjectGroupPrefix: 'data-object-group',
    moreSourceObjectsPrefix: '... and',
    moreSourceObjectsSuffix: 'more objects',
  },
  selectionBasket: {
    title: 'Selected sources',
    empty: 'No source objects selected yet.',
    selected: 'selected',
    remove: 'Remove',
    noColumns: 'Column metadata is not recorded for this selected source.',
    moreColumnsPrefix: 'and',
    moreColumnsSuffix: 'more columns',
  },
  catalog: {
    selectSourceObject: 'Select source object',
    selectSourceDatabase: 'Select source database',
    selectSourceSchema: 'Select source schema',
    expandSourceSchema: 'Expand source schema',
    collapseSourceSchema: 'Collapse source schema',
    inSourceDatabase: 'In source database',
    inspectSourceObjectMetadata: 'Inspect source object',
    metadata: 'metadata',
    rowSingular: 'row',
    rowPlural: 'rows',
    estimatedSizePrefix: 'Estimated',
    columnSingular: 'column',
    columnPlural: 'columns',
    objectSingular: 'object',
    objectPlural: 'objects',
    schemaSingular: 'schema',
    schemaPlural: 'schemas',
    allSelected: 'All selected',
    notNull: 'Not null',
    primaryKey: 'Primary key',
    unique: 'Unique',
    available: 'available',
    showing: 'Showing',
    of: 'of',
    filterAll: 'All',
    filterSelected: 'Selected',
    filterWithColumns: 'With columns',
    filterImportable: 'Importable',
    filterListLabel: 'Source catalog filters',
    filterAccessibilityPrefix: 'Filter source catalog by',
    locatorKindLabels: {
      relation: 'Relations',
      file: 'Files',
      endpoint: 'Endpoints',
      stream: 'Streams',
    },
    unsupportedImport:
      'Visible for inspection. This importer currently attaches relational source objects only.',
  },
  result: {
    title: 'Sources imported',
    description:
      'The selected source objects were written through the active Canvas authoring authority.',
    groupsCreatedLabel: 'Groups created:',
    objectsRegisteredLabel: 'Objects registered:',
    filesTitle: 'Source files updated',
    fileLabel: 'file',
    graphDraftWarning:
      'Canvas queued the imported source ids and will focus them when the governed draft authority refreshes.',
    dbtProjectFilesWarning:
      'The dbt project files were updated and the file-backed graph projection will refresh from project authority.',
  },
} as const;

type LocalizedCopyShape<Value> = Value extends string
  ? string
  : Value extends Readonly<Record<string, unknown>>
    ? { readonly [Key in keyof Value]: LocalizedCopyShape<Value[Key]> }
    : Value;

export type SourceImportWizardCopy = LocalizedCopyShape<typeof EN_COPY>;

const ES_COPY = {
  title: 'Añadir origen',
  description:
    'Explora conexiones gobernadas, inspecciona objetos de origen y adjunta al canvas los orígenes compatibles.',
  closeAction: 'Cerrar importación de orígenes',
  sections: {
    ariaLabel: 'Secciones para añadir orígenes',
    connections: 'Conexiones',
    browse: 'Explorar',
    metadata: 'Metadatos',
    selected: 'Seleccionados',
  },
  footer: {
    doneAction: 'Terminar',
    cancelAction: 'Cancelar',
    attachingAction: 'Adjuntando...',
    attachAction: 'Adjuntar orígenes al canvas',
  },
  selectConnectionError: 'Selecciona una conexión',
  selectAtLeastOneObjectError: 'Selecciona al menos un objeto de origen importable.',
  loadConnectionsError: 'No se pudieron cargar las conexiones del warehouse.',
  loadSourceObjectsError: 'No se pudieron cargar los objetos de origen.',
  matchDbtSourceTablesError:
    'Esta conexión no expone todas las tablas declaradas por los orígenes dbt importados.',
  importSuccess: 'Orígenes adjuntados correctamente',
  importError: 'No se pudieron registrar los objetos de datos.',
  connection: {
    title: 'Elegir conexión a base de datos',
    databaseBadge: 'Base de datos',
    description:
      'Elige la conexión a base de datos que se usará para descubrir los objetos de datos disponibles.',
    loading: 'Cargando conexiones...',
    searchLabel: 'Buscar conexiones gobernadas',
    catalogSource: 'Catálogo: .dvt/warehouse-connections.json',
    catalogSummarySingular: '{count} conexión en el catálogo gobernado',
    catalogSummaryPlural: '{count} conexiones en el catálogo gobernado',
    empty: 'No se encontraron conexiones gobernadas a bases de datos.',
    emptyHint:
      'Añade conexiones a base de datos al catálogo del workspace antes de importar orígenes.',
    noMatches: 'Ninguna conexión gobernada coincide con la búsqueda actual.',
    createAction: 'Nueva conexión',
    createTitle: 'Registrar conexión a base de datos',
    createDescription:
      'Crea una entrada gobernada en el catálogo mediante una referencia de credencial resuelta por el servidor.',
    createNameLabel: 'Nombre de la conexión',
    createTypeLabel: 'Tipo de conexión',
    createDatabaseLabel: 'Base de datos',
    createCredentialRefLabel: 'Referencia de credencial',
    createCredentialRefPlaceholder: 'postgres:local-warehouse',
    createSubmitAction: 'Crear conexión',
    creatingAction: 'Creando...',
    createCancelAction: 'Cancelar',
    createValidationError:
      'El nombre, la base de datos y la referencia de credencial son obligatorios.',
    createCredentialRefError:
      'Usa una referencia con formato postgres:<alias>. No introduzcas la URL ni la contraseña.',
    createSuccess: 'Conexión al warehouse creada',
    createError: 'No se pudo crear la conexión al warehouse.',
    renameAction: 'Cambiar nombre',
    renameTitle: 'Cambiar nombre de la conexión',
    renameNameLabel: 'Nuevo nombre de la conexión',
    renameSubmitAction: 'Guardar nombre',
    renamingAction: 'Guardando...',
    renameCancelAction: 'Cancelar',
    renameValidationError: 'Escribe un nombre distinto para la conexión.',
    duplicateNameError: 'Ya existe una conexión con ese nombre. Elige otro nombre.',
    renameSuccess: 'Nombre de la conexión actualizado',
    renameError: 'No se pudo cambiar el nombre de la conexión.',
    testAction: 'Probar conexión',
    testingAction: 'Probando...',
    testPassed: 'Conexión correcta',
    testFailed: 'Conexión fallida',
    testFailedDetail: 'Comprueba las credenciales y la disponibilidad de la conexión.',
    testError: 'No se pudo probar la conexión al warehouse.',
    reachableObjects: 'objetos accesibles',
  },
  selection: {
    title: 'Explorar objetos de origen',
    descriptionPrefix: 'Elige los objetos compatibles que se adjuntarán como nodos. Seleccionados:',
    loading: 'Cargando objetos de origen...',
    empty: 'No hay objetos de origen disponibles para esta conexión.',
    searchLabel: 'Buscar en el catálogo de orígenes',
    searchPlaceholder: 'Buscar por nombre, localizador, columna o tipo',
  },
  metadata: {
    title: 'Metadatos de los orígenes seleccionados',
    description: 'Inspecciona cada objeto seleccionado antes de registrar la selección.',
    sharedDatabaseLabel: 'Base de datos compartida',
    noObjectSelected: 'Ningún objeto de origen seleccionado',
    rowsUnknown: 'Filas desconocidas',
    sizeUnknown: 'Tamaño desconocido',
    noColumns: '0 columnas',
    columnsUnavailable: 'No hay metadatos de columnas registrados para este objeto seleccionado.',
    optionsUnavailable:
      'Las opciones de importación no están disponibles porque el importador relacional aún no puede adjuntar este objeto de origen.',
  },
  grouping: {
    title: 'Estrategia de agrupación',
    description: 'Elige cómo agrupar los objetos de origen relacionales en el registro dbt.',
    options: {
      schema: {
        label: 'Agrupar por esquema (recomendado)',
        description: 'Crea un origen por esquema. Ejemplo: RAW.ERP.ORDERS -> source(erp)',
        badge: 'Adecuado para empresas',
      },
      database: {
        label: 'Agrupar por base de datos',
        description: 'Crea un origen por base de datos. Recomendado para proyectos pequeños.',
      },
    },
  },
  options: {
    title: 'Opciones de metadatos',
    description: 'Configura los metadatos que se incluirán al registrar los objetos de datos.',
    defaultLabel: 'Predeterminado',
    enabledShortLabel: 'SÍ',
    disabledShortLabel: 'NO',
  },
  review: {
    title: 'Orígenes seleccionados',
    description: 'Revisa los objetos de origen seleccionados antes de adjuntarlos al canvas.',
    previewTitle: 'Vista previa de adjuntos del canvas',
    connectionLabel: 'Conexión:',
    sourceObjectsSelectedLabel: 'Objetos de origen seleccionados:',
    dataObjectGroupsLabel: 'Grupos de objetos de datos:',
    groupingStrategyLabel: 'Estrategia de agrupación:',
    groupingStrategySchemaLabel: 'Esquema',
    groupingStrategyDatabaseLabel: 'Base de datos',
    enabledLabel: 'Sí',
    disabledLabel: 'No',
    registryFileLabel: 'Archivo de registro',
    destinationPosture:
      'El destino se configura en un nodo DVT Sink después de registrar el origen; verifica el destino de salida antes de previsualizar o ejecutar el grafo.',
    dataObjectGroupPrefix: 'grupo-de-objetos-de-datos',
    moreSourceObjectsPrefix: '... y',
    moreSourceObjectsSuffix: 'objetos más',
  },
  selectionBasket: {
    title: 'Orígenes seleccionados',
    empty: 'Aún no se ha seleccionado ningún objeto de origen.',
    selected: 'seleccionado',
    remove: 'Quitar',
    noColumns: 'No hay metadatos de columnas registrados para este origen seleccionado.',
    moreColumnsPrefix: 'y',
    moreColumnsSuffix: 'columnas más',
  },
  catalog: {
    selectSourceObject: 'Seleccionar objeto de origen',
    selectSourceDatabase: 'Seleccionar base de datos de origen',
    selectSourceSchema: 'Seleccionar esquema de origen',
    expandSourceSchema: 'Expandir esquema de origen',
    collapseSourceSchema: 'Contraer esquema de origen',
    inSourceDatabase: 'En la base de datos de origen',
    inspectSourceObjectMetadata: 'Inspeccionar objeto de origen',
    metadata: 'metadatos',
    rowSingular: 'fila',
    rowPlural: 'filas',
    estimatedSizePrefix: 'Estimado',
    columnSingular: 'columna',
    columnPlural: 'columnas',
    objectSingular: 'objeto',
    objectPlural: 'objetos',
    schemaSingular: 'esquema',
    schemaPlural: 'esquemas',
    allSelected: 'Todos seleccionados',
    notNull: 'No admite valores null',
    primaryKey: 'Clave primaria',
    unique: 'Único',
    available: 'disponibles',
    showing: 'Mostrando',
    of: 'de',
    filterAll: 'Todos',
    filterSelected: 'Seleccionados',
    filterWithColumns: 'Con columnas',
    filterImportable: 'Importables',
    filterListLabel: 'Filtros del catálogo de orígenes',
    filterAccessibilityPrefix: 'Filtrar el catálogo de orígenes por',
    locatorKindLabels: {
      relation: 'Relaciones',
      file: 'Archivos',
      endpoint: 'Endpoints',
      stream: 'Streams',
    },
    unsupportedImport:
      'Visible para inspección. Este importador sólo adjunta actualmente objetos de origen relacionales.',
  },
  result: {
    title: 'Orígenes importados',
    description:
      'Los objetos de origen seleccionados se escribieron mediante la autoridad de edición activa del Canvas.',
    groupsCreatedLabel: 'Grupos creados:',
    objectsRegisteredLabel: 'Objetos registrados:',
    filesTitle: 'Archivos de origen actualizados',
    fileLabel: 'archivo',
    graphDraftWarning:
      'Canvas ha puesto en cola los identificadores importados y los enfocará cuando se actualice la autoridad gobernada del borrador.',
    dbtProjectFilesWarning:
      'Se actualizaron los archivos del proyecto dbt y la proyección del grafo se refrescará desde la autoridad del proyecto.',
  },
} satisfies SourceImportWizardCopy;

const COPY_BY_LANGUAGE: Readonly<Record<ApplicationLanguage, SourceImportWizardCopy>> = {
  en: EN_COPY,
  es: ES_COPY,
};

const NUMBER_FORMATTER_BY_LANGUAGE: Readonly<Record<ApplicationLanguage, Intl.NumberFormat>> = {
  en: new Intl.NumberFormat('en-US'),
  es: new Intl.NumberFormat('es-ES'),
};

export const sourceImportWizardCopy = EN_COPY;
export const sourceImportCatalogNumberFormatter = NUMBER_FORMATTER_BY_LANGUAGE.en;

export function resolveSourceImportWizardCopy(
  language: ApplicationLanguage
): SourceImportWizardCopy {
  return COPY_BY_LANGUAGE[language];
}

export function resolveSourceImportCatalogNumberFormatter(
  language: ApplicationLanguage
): Intl.NumberFormat {
  return NUMBER_FORMATTER_BY_LANGUAGE[language];
}

export function resolveSourceImportFailureMessage(
  copy: SourceImportWizardCopy,
  failure: SourceImportFailure | null
): string | null {
  if (!failure) {
    return null;
  }

  switch (failure.code) {
    case 'select-connection':
      return copy.selectConnectionError;
    case 'load-connections':
      return copy.loadConnectionsError;
    case 'load-source-objects':
      return copy.loadSourceObjectsError;
    case 'match-dbt-source-tables':
      return copy.matchDbtSourceTablesError;
    case 'test-connection':
      return copy.connection.testError;
    case 'create-connection-validation':
      return copy.connection.createValidationError;
    case 'create-connection-credential-reference':
      return copy.connection.createCredentialRefError;
    case 'create-connection':
      return copy.connection.createError;
    case 'rename-connection-validation':
      return copy.connection.renameValidationError;
    case 'connection-name-conflict':
      return copy.connection.duplicateNameError;
    case 'rename-connection':
      return copy.connection.renameError;
    case 'import-sources':
      return copy.importError;
  }
}

export function useSourceImportLocalization(): Readonly<{
  copy: SourceImportWizardCopy;
  language: ApplicationLanguage;
  numberFormatter: Intl.NumberFormat;
}> {
  const language = useApplicationLanguageStore((state) => state.language);
  return {
    copy: resolveSourceImportWizardCopy(language),
    language,
    numberFormatter: resolveSourceImportCatalogNumberFormatter(language),
  };
}
