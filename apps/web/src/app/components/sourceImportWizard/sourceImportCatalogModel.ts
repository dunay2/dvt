import { resolveSourceObjectColumnConstraintSemantics } from '@dvt/contracts';

import type { SourceImportSchemaIdentity, TableInfo } from './types';
import { describeSourceObjectMetricEvidence } from '../../services/workspace/sourceObjectMetricEvidencePresentation';

export type SourceImportColumnViewModel = Readonly<{
  name: string;
  type: string;
  nullabilityLabel: string;
  constraintLabels: readonly string[];
}>;

export type SourceImportTableViewModel = Readonly<{
  index: number;
  identityKey: string;
  canonicalName: string;
  displayName: string;
  accessibilityLabel: string;
  inspectionAccessibilityLabel: string;
  rowCountLabel: string;
  rowCountDetail: string;
  rowCountTone: 'measured' | 'estimated';
  byteSizeLabel: string;
  byteSizeDetail: string;
  byteSizeTone: 'measured' | 'estimated';
  columnCountLabel: string;
  selected: boolean;
  selectedLabel: string;
  columns: readonly SourceImportColumnViewModel[];
}>;

export type SourceImportCatalogFilterId = 'all' | 'selected' | 'withColumns';

export type SourceImportCatalogFilterViewModel = Readonly<{
  id: SourceImportCatalogFilterId;
  label: string;
  countLabel: string;
  active: boolean;
  disabled: boolean;
  accessibilityLabel: string;
}>;

export type SourceImportSchemaGroupViewModel = Readonly<{
  schema: string;
  accessibilityLabel: string;
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
  activeFilterId: SourceImportCatalogFilterId;
  filterListLabel: string;
  categoryFilters: readonly SourceImportCatalogFilterViewModel[];
}>;

export type SourceImportCatalogCopy = Readonly<{
  selectSourceTable: string;
  selectSourceDatabase: string;
  selectSourceSchema: string;
  inSourceDatabase: string;
  inspectSourceTableMetadata: string;
  metadata: string;
  rowSingular: string;
  rowPlural: string;
  estimatedSizePrefix: string;
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
  filterAll: string;
  filterSelected: string;
  filterWithColumns: string;
  filterListLabel: string;
  filterAccessibilityPrefix: string;
}>;

export function buildRelationalSourceObjectName(sourceObject: Pick<TableInfo, 'locator'>): string {
  return [
    sourceObject.locator.catalog,
    sourceObject.locator.schema,
    sourceObject.locator.name,
  ].join('.');
}

export function buildSourceObjectIdentityKey(sourceObject: Pick<TableInfo, 'objectId'>): string {
  return sourceObject.objectId;
}

export function buildSourceImportSchemaKey(schema: SourceImportSchemaIdentity): string {
  return JSON.stringify([schema.database, schema.schema]);
}

function formatNumber(value: number, numberFormatter: Intl.NumberFormat): string {
  return numberFormatter.format(value);
}

export function formatSourceImportRowCount(
  rowCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
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

export function formatSourceImportByteSize(byteSize: number): string {
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

function formatSourceImportByteDetail(
  byteSize: number,
  compact: string,
  numberFormatter: Intl.NumberFormat
): string {
  const exact = `${numberFormatter.format(Math.round(byteSize))} B`;
  return exact === compact ? exact : `${exact} (${compact})`;
}

export function formatSourceImportSizeEvidence(
  table: Pick<TableInfo, 'metricEvidence'>,
  copy: Pick<SourceImportCatalogCopy, 'estimatedSizePrefix'>
): string {
  const size = formatSourceImportByteSize(table.metricEvidence.byteSize.value);
  return table.metricEvidence.byteSize.provenance === 'estimated'
    ? `${copy.estimatedSizePrefix} ${size}`
    : size;
}

export function formatSourceImportTableCount(
  objectCount: number,
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): string {
  const suffix = objectCount === 1 ? copy.tableSingular : copy.tablePlural;
  return `${formatNumber(objectCount, numberFormatter)} ${suffix}`;
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
    table.locator.catalog,
    table.locator.schema,
    table.locator.name,
    ...(table.columns?.flatMap((column) => [column.name, column.type]) ?? []),
  ];

  return searchableValues.some((value) =>
    normalizeCatalogSearchValue(value).includes(normalizedSearchQuery)
  );
}

function tableMatchesSourceImportFilter(
  table: TableInfo,
  filterId: SourceImportCatalogFilterId
): boolean {
  switch (filterId) {
    case 'selected':
      return table.selected;
    case 'withColumns':
      return (table.columns?.length ?? 0) > 0;
    case 'all':
      return true;
    default:
      return true;
  }
}

function buildSourceImportCatalogFilters({
  searchableTables,
  activeFilterId,
  copy,
  numberFormatter,
}: Readonly<{
  searchableTables: readonly TableInfo[];
  activeFilterId: SourceImportCatalogFilterId;
  copy: SourceImportCatalogCopy;
  numberFormatter: Intl.NumberFormat;
}>): readonly SourceImportCatalogFilterViewModel[] {
  const filterDefinitions: readonly Readonly<{
    id: SourceImportCatalogFilterId;
    label: string;
  }>[] = [
    { id: 'all', label: copy.filterAll },
    { id: 'selected', label: copy.filterSelected },
    { id: 'withColumns', label: copy.filterWithColumns },
  ];

  return filterDefinitions.map((filter) => {
    const count = searchableTables.filter((table) =>
      tableMatchesSourceImportFilter(table, filter.id)
    ).length;
    const countLabel = formatNumber(count, numberFormatter);
    const tableCountLabel = formatSourceImportTableCount(count, copy, numberFormatter);

    return {
      id: filter.id,
      label: filter.label,
      countLabel,
      active: filter.id === activeFilterId,
      disabled: count === 0,
      accessibilityLabel: `${copy.filterAccessibilityPrefix} ${filter.label}. ${tableCountLabel}.`,
    };
  });
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
  const identityKey = buildSourceObjectIdentityKey(table);
  const canonicalName = buildRelationalSourceObjectName(table);
  const rowCountLabel = formatSourceImportRowCount(
    table.metricEvidence.rowCount.value,
    copy,
    numberFormatter
  );
  const byteSizeLabel = formatSourceImportSizeEvidence(table, copy);
  const compactByteSize = formatSourceImportByteSize(table.metricEvidence.byteSize.value);
  const columnCountLabel = formatSourceImportColumnCount(
    table.columns?.length ?? 0,
    copy,
    numberFormatter
  );
  const accessibilityMetrics = [rowCountLabel, byteSizeLabel, columnCountLabel].join('. ');

  return {
    index,
    identityKey,
    canonicalName,
    displayName: table.displayName,
    accessibilityLabel: `${copy.selectSourceTable} ${canonicalName}. ${accessibilityMetrics}.`,
    inspectionAccessibilityLabel: `${copy.inspectSourceTableMetadata} ${canonicalName} ${copy.metadata}. ${accessibilityMetrics}.`,
    rowCountLabel,
    rowCountDetail: describeSourceObjectMetricEvidence({
      metric: table.metricEvidence.rowCount,
      subject: rowCountLabel,
      evidence: table.metricEvidence,
    }),
    rowCountTone: table.metricEvidence.rowCount.provenance,
    byteSizeLabel,
    byteSizeDetail: describeSourceObjectMetricEvidence({
      metric: table.metricEvidence.byteSize,
      subject: formatSourceImportByteDetail(
        table.metricEvidence.byteSize.value,
        compactByteSize,
        numberFormatter
      ),
      evidence: table.metricEvidence,
      basis: table.metricEvidence.byteSize.basis,
    }),
    byteSizeTone: table.metricEvidence.byteSize.provenance,
    columnCountLabel,
    selected: table.selected,
    selectedLabel: copy.filterSelected,
    columns:
      table.columns?.map((column) => {
        const nullabilityLabel = formatSourceImportNullability(column.nullable, copy);
        const constraintSemantics = resolveSourceObjectColumnConstraintSemantics(
          table,
          column.name
        );
        const constraintLabels = [
          ...(constraintSemantics.primaryKey ? [copy.primaryKey] : []),
          ...(constraintSemantics.independentlyUnique ? [copy.unique] : []),
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
  filterId = 'all',
  copy,
  numberFormatter = new Intl.NumberFormat(),
}: Readonly<{
  tables: readonly TableInfo[];
  activeTableKey: string | null;
  searchQuery?: string;
  filterId?: SourceImportCatalogFilterId;
  copy: SourceImportCatalogCopy;
  numberFormatter?: Intl.NumberFormat;
}>): SourceImportCatalogViewModel {
  const normalizedSearchQuery = normalizeCatalogSearchValue(searchQuery);
  const allTableViewModels = tables.map((table, index) =>
    buildSourceImportTableViewModel(table, index, copy, numberFormatter)
  );
  const searchableTableEntries = tables
    .map((table, index) => ({ table, viewModel: allTableViewModels[index]! }))
    .filter(({ table }) => tableMatchesSourceImportSearch(table, normalizedSearchQuery));
  const visibleTableEntries = searchableTableEntries.filter(({ table }) =>
    tableMatchesSourceImportFilter(table, filterId)
  );
  const tableViewModels = visibleTableEntries.map(({ viewModel }) => viewModel);
  const databaseGroupsByName = new Map<string, Map<string, SourceImportTableViewModel[]>>();

  visibleTableEntries.forEach(({ table, viewModel }) => {
    const databaseSchemas = databaseGroupsByName.get(table.locator.catalog) ?? new Map();
    const databaseSchemaGroup = databaseSchemas.get(table.locator.schema) ?? [];
    databaseSchemaGroup.push(viewModel);
    databaseSchemas.set(table.locator.schema, databaseSchemaGroup);
    databaseGroupsByName.set(table.locator.catalog, databaseSchemas);
  });

  const activeTable =
    (activeTableKey
      ? tableViewModels.find((table) => table.identityKey === activeTableKey)
      : undefined) ??
    tableViewModels.find((table) => table.selected) ??
    tableViewModels[0] ??
    null;
  const schemaGroups = Array.from(databaseGroupsByName.entries())
    .flatMap(([database, databaseSchemaGroups]) =>
      Array.from(databaseSchemaGroups.entries()).map(([schema, groupTables]) => ({
        database,
        schema,
        groupTables,
      }))
    )
    .sort(
      (left, right) =>
        left.database.localeCompare(right.database) || left.schema.localeCompare(right.schema)
    )
    .map(({ database, schema, groupTables }) =>
      buildSourceImportSchemaGroup(database, schema, groupTables, copy, numberFormatter)
    );
  const databaseGroups = Array.from(databaseGroupsByName.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([database, databaseSchemaGroups]) => {
      const databaseSchemas = Array.from(databaseSchemaGroups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([schema, groupTables]) =>
          buildSourceImportSchemaGroup(database, schema, groupTables, copy, numberFormatter)
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
    selectedTables: allTableViewModels.filter((table) => table.selected),
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
    activeFilterId: filterId,
    filterListLabel: copy.filterListLabel,
    categoryFilters: buildSourceImportCatalogFilters({
      searchableTables: searchableTableEntries.map(({ table }) => table),
      activeFilterId: filterId,
      copy,
      numberFormatter,
    }),
  };
}

function buildSourceImportSchemaGroup(
  database: string,
  schema: string,
  groupTables: readonly SourceImportTableViewModel[],
  copy: SourceImportCatalogCopy,
  numberFormatter: Intl.NumberFormat
): SourceImportSchemaGroupViewModel {
  return {
    schema,
    accessibilityLabel: `${copy.selectSourceSchema} ${schema}. ${copy.inSourceDatabase} ${database}. ${formatSourceImportTableCount(
      groupTables.length,
      copy,
      numberFormatter
    )}.`,
    tableCountLabel: formatSourceImportTableCount(groupTables.length, copy, numberFormatter),
    selected: groupTables.length > 0 && groupTables.every((table) => table.selected),
    tables: groupTables,
  };
}
