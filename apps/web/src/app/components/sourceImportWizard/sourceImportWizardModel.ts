import { WIZARD_STEPS } from './constants';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import type { SourceImportSection, TableInfo, WizardStep } from './types';

export type SourceImportColumnViewModel = Readonly<{
  name: string;
  type: string;
  nullabilityLabel: 'Nullable' | 'Required';
}>;

export type SourceImportTableViewModel = Readonly<{
  index: number;
  canonicalName: string;
  displayName: string;
  rowCountLabel: string;
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

export type SourceImportCatalogViewModel = Readonly<{
  schemaGroups: readonly SourceImportSchemaGroupViewModel[];
  activeTable: SourceImportTableViewModel | null;
  selectedTables: readonly SourceImportTableViewModel[];
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

export function formatSourceImportTableCount(tableCount: number): string {
  return `${tableCount} ${tableCount === 1 ? 'table' : 'tables'}`;
}

export function formatSourceImportNullability(nullable: boolean): 'Nullable' | 'Required' {
  return nullable ? 'Nullable' : 'Required';
}

export function buildSourceImportTableViewModel(
  table: TableInfo,
  index: number
): SourceImportTableViewModel {
  return {
    index,
    canonicalName: buildWarehouseTableKey(table),
    displayName: table.table,
    rowCountLabel: formatSourceImportRowCount(table.rowCount),
    columnCountLabel: formatSourceImportColumnCount(table.columns?.length ?? 0),
    selected: table.selected,
    columns:
      table.columns?.map((column) => ({
        name: column.name,
        type: column.type,
        nullabilityLabel: formatSourceImportNullability(column.nullable),
      })) ?? [],
  };
}

export function buildSourceImportCatalogViewModel({
  tables,
  activeTableKey,
}: Readonly<{
  tables: readonly TableInfo[];
  activeTableKey: string | null;
}>): SourceImportCatalogViewModel {
  const tableViewModels = tables.map((table, index) =>
    buildSourceImportTableViewModel(table, index)
  );
  const schemaGroups = new Map<string, SourceImportTableViewModel[]>();

  tables.forEach((table, index) => {
    const group = schemaGroups.get(table.schema) ?? [];
    group.push(tableViewModels[index]!);
    schemaGroups.set(table.schema, group);
  });

  const activeTable =
    (activeTableKey
      ? tableViewModels.find((table) => table.canonicalName === activeTableKey)
      : undefined) ??
    tableViewModels.find((table) => table.selected) ??
    tableViewModels[0] ??
    null;

  return {
    schemaGroups: Array.from(schemaGroups.entries()).map(([schema, groupTables]) => ({
      schema,
      tableCountLabel: formatSourceImportTableCount(groupTables.length),
      selected: groupTables.length > 0 && groupTables.every((table) => table.selected),
      tables: groupTables,
    })),
    activeTable,
    selectedTables: tableViewModels.filter((table) => table.selected),
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
  selectedCount: number
): boolean {
  if (section === 'connections') {
    return true;
  }
  if (section === 'browse') {
    return selectedConnection != null;
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
