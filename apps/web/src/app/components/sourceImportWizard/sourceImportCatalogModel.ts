import type { SourceImportSchemaIdentity, TableInfo } from './types';

export type SourceImportColumnViewModel = Readonly<{
  name: string;
  type: string;
  nullabilityLabel: string;
  constraintLabels: readonly string[];
}>;

export type SourceImportTableViewModel = Readonly<{
  index: number;
  canonicalName: string;
  displayName: string;
  accessibilityLabel: string;
  inspectionAccessibilityLabel: string;
  rowCountLabel: string;
  byteSizeLabel: string | null;
  columnCountLabel: string;
  selected: boolean;
  columns: readonly SourceImportColumnViewModel[];
}>;

export type SourceImportSchemaGroupViewModel = Readonly<{
  schema: string;
  tableCountLabel: string;
  selected: boolean;
  tables: readonly SourceImportTableViewModel[];
}>;

export type SourceImportDatabaseGroupViewModel = Readonly<{
  database: string;
  accessibilityLabel: string;
  schemaCountLabel: string;
  tableCountLabel: string;
  selectedLabel: string | null;
  selected: boolean;
  schemaGroups: readonly SourceImportSchemaGroupViewModel[];
}>;

export type SourceImportCatalogViewModel = Readonly<{
  databaseGroups: readonly SourceImportDatabaseGroupViewModel[];
  schemaGroups: readonly SourceImportSchemaGroupViewModel[];
  activeTable: SourceImportTableViewModel | null;
  selectedTables: readonly SourceImportTableViewModel[];
  totalTableCount: number;
  visibleTableCount: number;
  selectedTableCount: number;
  resultCountLabel: string;
}>;

export type SourceImportCatalogCopy = Readonly<{
  selectSourceTable: string;
  selectSourceDatabase: string;
  inspectSourceTableMetadata: string;
  metadata: string;
  rowsUnknown: string;
  rowSingular: string;
  rowPlural: string;
  columnSingular: string;
  columnPlural: string;
  tableSingular: string;
  tablePlural: string;
  schemaSingular: string;
  schemaPlural: string;
  allSelected: string;
  nullable: string;
  required: string;
  primaryKey: string;
  unique: string;
  available: string;
  showing: string;
  of: string;
}>;

export function buildWarehouseTableKey(
  table: Pick<TableInfo, 'database' | 'schema' | 'table'>
): string {
  return [table.database, table.schema, table.table].join('.');
}

export function buildSourceImportSchemaKey(schema: SourceImportSchemaIdentity): string {
  return [schema.database, schema.schema].join('.');
}

function formatNumber(value: number, numberFormatter: Intl.NumberFormat): string {
  return numberFormatter.format(value);
}

export function formatSourceImportRowCount(
  rowCount: number | undefined,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  if (rowCount == null) {
    return copy.rowsUnknown;
  }

  const suffix = rowCount === 1 ? copy.rowSingular : copy.rowPlural;
  return `${formatNumber(rowCount, numberFormatter)} ${suffix}`;
}

export function formatSourceImportColumnCount(
  columnCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = columnCount === 1 ? copy.columnSingular : copy.columnPlural;
  return `${formatNumber(columnCount, numberFormatter)} ${suffix}`;
}

export function formatSourceImportByteSize(byteSize: number | undefined): string | null {
  if (byteSize == null) {
    return null;
  }
  if (byteSize >= 1024 * 1024 * 1024) {
    return `${(byteSize / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '')} GB`;
  }
  if (byteSize >= 1024 * 1024) {
    return `${(byteSize / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  }
  if (byteSize >= 1024) {
    return `${(byteSize / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  }
  return `${byteSize} B`;
}

export function formatSourceImportTableCount(
  tableCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = tableCount === 1 ? copy.tableSingular : copy.tablePlural;
  return `${formatNumber(tableCount, numberFormatter)} ${suffix}`;
}

export function formatSourceImportSchemaCount(
  schemaCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = schemaCount === 1 ? copy.schemaSingular : copy.schemaPlural;
  return `${formatNumber(schemaCount, numberFormatter)} ${suffix}`;
}

function normalizeCatalogSearchValue(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function tableMatchesSourceImportSearch(table: TableInfo, normalizedSearchQuery: string): boolean {
  if (normalizedSearchQuery.length === 0) {
    return true;
  }

  const searchableValues = [
    table.database,
    table.schema,
    table.table,
    ...(table.columns?.flatMap((column) => [column.name, column.type]) ?? []),
  ];

  return searchableValues.some((value) =>
    normalizeCatalogSearchValue(value).includes(normalizedSearchQuery)
  );
}

export function formatSourceImportNullability(
  nullable: boolean,
  copy: SourceImportCatalogCopy
): string {
  return nullable ? copy.nullable : copy.required;
}

export function buildSourceImportTableViewModel(
  table: TableInfo,
  index: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): SourceImportTableViewModel {
  const canonicalName = buildWarehouseTableKey(table);
  const rowCountLabel = formatSourceImportRowCount(table.rowCount, copy, numberFormatter);
  const byteSizeLabel = formatSourceImportByteSize(table.byteSize);
  const columnCountLabel = formatSourceImportColumnCount(
    table.columns?.length ?? 0,
    copy,
    numberFormatter
  );
  const accessibilityMetrics = [rowCountLabel, byteSizeLabel, columnCountLabel]
    .filter((label): label is string => label != null)
    .join('. ');

  return {
    index,
    canonicalName,
    displayName: table.table,
    accessibilityLabel: `${copy.selectSourceTable} ${canonicalName}. ${accessibilityMetrics}.`,
    inspectionAccessibilityLabel: `${copy.inspectSourceTableMetadata} ${canonicalName} ${copy.metadata}. ${accessibilityMetrics}.`,
    rowCountLabel,
    byteSizeLabel,
    columnCountLabel,
    selected: table.selected,
    columns:
      table.columns?.map((column) => {
        const nullabilityLabel = formatSourceImportNullability(column.nullable, copy);
        const constraintLabels = [
          ...(column.primaryKey === true ? [copy.primaryKey] : []),
          ...(column.unique === true ? [copy.unique] : []),
          nullabilityLabel,
        ];

        return {
          name: column.name,
          type: column.type,
          nullabilityLabel,
          constraintLabels,
        };
      }) ?? [],
  };
}

export function buildSourceImportCatalogViewModel({
  tables,
  activeTableKey,
  searchQuery,
  copy,
  numberFormatter = new Intl.NumberFormat(),
}: Readonly<{
  tables: readonly TableInfo[];
  activeTableKey: string | null;
  searchQuery?: string;
  copy: SourceImportCatalogCopy;
  numberFormatter?: Intl.NumberFormat;
}>): SourceImportCatalogViewModel {
  const normalizedSearchQuery = normalizeCatalogSearchValue(searchQuery);
  const allTableViewModels = tables.map((table, index) =>
    buildSourceImportTableViewModel(table, index, copy, numberFormatter)
  );
  const visibleTableEntries = tables
    .map((table, index) => ({ table, viewModel: allTableViewModels[index]! }))
    .filter(({ table }) => tableMatchesSourceImportSearch(table, normalizedSearchQuery));
  const tableViewModels = visibleTableEntries.map(({ viewModel }) => viewModel);
  const schemaGroupsByName = new Map<string, SourceImportTableViewModel[]>();
  const databaseGroupsByName = new Map<string, Map<string, SourceImportTableViewModel[]>>();

  visibleTableEntries.forEach(({ table, viewModel }) => {
    const schemaGroup = schemaGroupsByName.get(table.schema) ?? [];
    schemaGroup.push(viewModel);
    schemaGroupsByName.set(table.schema, schemaGroup);

    const databaseSchemas = databaseGroupsByName.get(table.database) ?? new Map();
    const databaseSchemaGroup = databaseSchemas.get(table.schema) ?? [];
    databaseSchemaGroup.push(viewModel);
    databaseSchemas.set(table.schema, databaseSchemaGroup);
    databaseGroupsByName.set(table.database, databaseSchemas);
  });

  const activeTable =
    (activeTableKey
      ? tableViewModels.find((table) => table.canonicalName === activeTableKey)
      : undefined) ??
    tableViewModels.find((table) => table.selected) ??
    tableViewModels[0] ??
    null;
  const schemaGroups = Array.from(schemaGroupsByName.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([schema, groupTables]) =>
      buildSourceImportSchemaGroup(schema, groupTables, copy, numberFormatter)
    );
  const databaseGroups = Array.from(databaseGroupsByName.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([database, databaseSchemaGroups]) => {
      const databaseSchemas = Array.from(databaseSchemaGroups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([schema, groupTables]) =>
          buildSourceImportSchemaGroup(schema, groupTables, copy, numberFormatter)
        );
      const databaseTables = databaseSchemas.flatMap((schemaGroup) => schemaGroup.tables);

      return {
        database,
        accessibilityLabel: `${copy.selectSourceDatabase} ${database}. ${formatSourceImportSchemaCount(
          databaseSchemas.length,
          copy,
          numberFormatter
        )}. ${formatSourceImportTableCount(databaseTables.length, copy, numberFormatter)}.`,
        schemaCountLabel: formatSourceImportSchemaCount(
          databaseSchemas.length,
          copy,
          numberFormatter
        ),
        tableCountLabel: formatSourceImportTableCount(databaseTables.length, copy, numberFormatter),
        selected: databaseTables.length > 0 && databaseTables.every((table) => table.selected),
        selectedLabel:
          databaseTables.length > 0 && databaseTables.every((table) => table.selected)
            ? copy.allSelected
            : null,
        schemaGroups: databaseSchemas,
      };
    });

  return {
    databaseGroups,
    schemaGroups,
    activeTable,
    selectedTables: tableViewModels.filter((table) => table.selected),
    totalTableCount: allTableViewModels.length,
    visibleTableCount: tableViewModels.length,
    selectedTableCount: allTableViewModels.filter((table) => table.selected).length,
    resultCountLabel:
      tableViewModels.length === allTableViewModels.length
        ? `${formatSourceImportTableCount(
            allTableViewModels.length,
            copy,
            numberFormatter
          )} ${copy.available}`
        : `${copy.showing} ${formatNumber(tableViewModels.length, numberFormatter)} ${copy.of} ${formatNumber(
            allTableViewModels.length,
            numberFormatter
          )} ${copy.tablePlural}`,
  };
}

function buildSourceImportSchemaGroup(
  schema: string,
  groupTables: readonly SourceImportTableViewModel[],
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): SourceImportSchemaGroupViewModel {
  return {
    schema,
    tableCountLabel: formatSourceImportTableCount(groupTables.length, copy, numberFormatter),
    selected: groupTables.length > 0 && groupTables.every((table) => table.selected),
    tables: groupTables,
  };
}
