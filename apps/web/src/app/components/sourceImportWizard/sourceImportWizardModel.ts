import { WIZARD_STEPS } from './constants';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import type { SourceImportSection, TableInfo, WizardStep } from './types';

export type SourceImportColumnViewModel = Readonly<{
  name: string;
  type: string;
  nullabilityLabel: 'Nullable' | 'Required';
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
  schemaCountLabel: string;
  tableCountLabel: string;
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

export const SOURCE_IMPORT_SECTIONS: readonly {
  id: SourceImportSection;
  label: 'Connections' | 'Browse' | 'Metadata' | 'Selected';
  step: WizardStep;
}[] = [
  { id: 'connections', label: 'Connections', step: 'connection' },
  { id: 'browse', label: 'Browse', step: 'selection' },
  { id: 'metadata', label: 'Metadata', step: 'options' },
  { id: 'selected', label: 'Selected', step: 'review' },
];

export function buildWarehouseTableKey(
  table: Pick<TableInfo, 'database' | 'schema' | 'table'>
): string {
  return [table.database, table.schema, table.table].join('.');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatSourceImportRowCount(rowCount: number | undefined): string {
  if (rowCount == null) {
    return 'Rows unknown';
  }

  return `${formatNumber(rowCount)} rows`;
}

export function formatSourceImportColumnCount(columnCount: number): string {
  return `${columnCount} ${columnCount === 1 ? 'column' : 'columns'}`;
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

export function formatSourceImportTableCount(tableCount: number): string {
  return `${tableCount} ${tableCount === 1 ? 'table' : 'tables'}`;
}

export function formatSourceImportSchemaCount(schemaCount: number): string {
  return `${schemaCount} ${schemaCount === 1 ? 'schema' : 'schemas'}`;
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

export function formatSourceImportNullability(nullable: boolean): 'Nullable' | 'Required' {
  return nullable ? 'Nullable' : 'Required';
}

export function buildSourceImportTableViewModel(
  table: TableInfo,
  index: number
): SourceImportTableViewModel {
  const canonicalName = buildWarehouseTableKey(table);
  const rowCountLabel = formatSourceImportRowCount(table.rowCount);
  const byteSizeLabel = formatSourceImportByteSize(table.byteSize);
  const columnCountLabel = formatSourceImportColumnCount(table.columns?.length ?? 0);
  const accessibilityMetrics = [rowCountLabel, byteSizeLabel, columnCountLabel]
    .filter((label): label is string => label != null)
    .join('. ');

  return {
    index,
    canonicalName,
    displayName: table.table,
    accessibilityLabel: `Select source table ${canonicalName}. ${accessibilityMetrics}.`,
    inspectionAccessibilityLabel: `Inspect source table ${canonicalName} metadata. ${accessibilityMetrics}.`,
    rowCountLabel,
    byteSizeLabel,
    columnCountLabel,
    selected: table.selected,
    columns:
      table.columns?.map((column) => {
        const nullabilityLabel = formatSourceImportNullability(column.nullable);
        const constraintLabels = [
          ...(column.primaryKey === true ? ['Primary key'] : []),
          ...(column.unique === true ? ['Unique'] : []),
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
}: Readonly<{
  tables: readonly TableInfo[];
  activeTableKey: string | null;
  searchQuery?: string;
}>): SourceImportCatalogViewModel {
  const normalizedSearchQuery = normalizeCatalogSearchValue(searchQuery);
  const allTableViewModels = tables.map((table, index) =>
    buildSourceImportTableViewModel(table, index)
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
    .map(([schema, groupTables]) => buildSourceImportSchemaGroup(schema, groupTables));
  const databaseGroups = Array.from(databaseGroupsByName.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([database, databaseSchemaGroups]) => {
      const databaseSchemas = Array.from(databaseSchemaGroups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([schema, groupTables]) => buildSourceImportSchemaGroup(schema, groupTables));
      const databaseTables = databaseSchemas.flatMap((schemaGroup) => schemaGroup.tables);

      return {
        database,
        schemaCountLabel: formatSourceImportSchemaCount(databaseSchemas.length),
        tableCountLabel: formatSourceImportTableCount(databaseTables.length),
        selected: databaseTables.length > 0 && databaseTables.every((table) => table.selected),
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
        ? `${formatSourceImportTableCount(allTableViewModels.length)} available`
        : `Showing ${tableViewModels.length} of ${allTableViewModels.length} tables`,
  };
}

function buildSourceImportSchemaGroup(
  schema: string,
  groupTables: readonly SourceImportTableViewModel[]
): SourceImportSchemaGroupViewModel {
  return {
    schema,
    tableCountLabel: formatSourceImportTableCount(groupTables.length),
    selected: groupTables.length > 0 && groupTables.every((table) => table.selected),
    tables: groupTables,
  };
}

export function getSelectedCount(tables: TableInfo[]): number {
  return tables.filter((table) => table.selected).length;
}

export function groupTablesBySchema(tables: TableInfo[]): Record<string, TableInfo[]> {
  return tables.reduce<Record<string, TableInfo[]>>((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = [];
    }
    acc[table.schema]?.push(table);
    return acc;
  }, {});
}

export function buildPreviewGroups(
  tables: TableInfo[],
  groupingStrategy: 'schema' | 'database' | 'custom'
): Map<string, TableInfo[]> {
  const selectedTables = tables.filter((table) => table.selected);
  const groups = new Map<string, TableInfo[]>();
  selectedTables.forEach((table) => {
    const key = groupingStrategy === 'schema' ? table.schema : table.database;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(table);
  });
  return groups;
}

export function getSelectedTables(tables: readonly TableInfo[]): readonly TableInfo[] {
  return tables.filter((table) => table.selected);
}

export function resolveActiveTable(
  tables: readonly TableInfo[],
  activeTableKey: string | null
): TableInfo | null {
  if (activeTableKey != null) {
    const activeTable = tables.find((table) => buildWarehouseTableKey(table) === activeTableKey);
    if (activeTable) {
      return activeTable;
    }
  }

  return tables.find((table) => table.selected) ?? tables[0] ?? null;
}

export function resolveSectionForStep(step: WizardStep): SourceImportSection {
  if (step === 'selection') {
    return 'browse';
  }
  if (step === 'grouping' || step === 'options') {
    return 'metadata';
  }
  if (step === 'review' || step === 'result') {
    return 'selected';
  }

  return 'connections';
}

export function resolveStepForSection(section: SourceImportSection): WizardStep {
  return SOURCE_IMPORT_SECTIONS.find((candidate) => candidate.id === section)?.step ?? 'connection';
}

export function canEnterSourceImportSection(
  section: SourceImportSection,
  selectedConnection: string | null,
  selectedCount: number,
  hasActiveTable = selectedCount > 0
): boolean {
  if (section === 'connections') {
    return true;
  }
  if (section === 'browse') {
    return selectedConnection != null;
  }
  if (section === 'metadata') {
    return selectedConnection != null && hasActiveTable;
  }

  return selectedConnection != null && selectedCount > 0;
}

export function buildSourceImportOptionValues(
  input: Readonly<Record<SourceImportOptionId, boolean>>
): Readonly<Record<SourceImportOptionId, boolean>> {
  return {
    includeColumns: input.includeColumns,
    addTests: input.addTests,
    addFreshness: input.addFreshness,
  };
}

export function applySourceImportOptionDefaults<T extends Record<SourceImportOptionId, boolean>>(
  state: T,
  options: readonly SourceImportOptionContribution[]
): T {
  return options.reduce<T>(
    (nextState, option) => ({
      ...nextState,
      [option.id]: option.defaultEnabled,
    }),
    state
  );
}

export function canProceedForStep(
  step: WizardStep,
  selectedConnection: string | null,
  selectedCount: number
): boolean {
  if (step === 'connection') {
    return !!selectedConnection;
  }
  if (step === 'selection') {
    return selectedCount > 0;
  }
  return true;
}

export function getNextStep(step: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(step);
  return WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)] ?? step;
}

export function getPreviousStep(step: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(step);
  return WIZARD_STEPS[Math.max(index - 1, 0)] ?? step;
}
