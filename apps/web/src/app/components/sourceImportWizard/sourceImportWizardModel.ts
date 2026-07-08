import { WIZARD_STEPS } from './constants';
import type { SourceImportOptionContribution, SourceImportOptionId } from '../../plugins/registry';
import { buildWarehouseTableKey } from './sourceImportCatalogModel';
import type {
  SourceImportDatabaseIdentity,
  SourceImportSchemaIdentity,
  SourceImportSection,
  TableInfo,
  WizardStep,
} from './types';

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

export function getSelectedCount(tables: TableInfo[]): number {
  return tables.filter((table) => table.selected).length;
}

export function toggleSourceImportSchemaSelection(
  tables: readonly TableInfo[],
  schemaIdentity: SourceImportSchemaIdentity
): Readonly<{ tables: TableInfo[]; activeTableKey: string | null }> {
  const schemaTables = tables.filter(
    (table) => table.database === schemaIdentity.database && table.schema === schemaIdentity.schema
  );
  const allSelected = schemaTables.length > 0 && schemaTables.every((table) => table.selected);
  const firstSchemaTable = schemaTables[0];

  return {
    tables: tables.map((table) =>
      table.database === schemaIdentity.database && table.schema === schemaIdentity.schema
        ? { ...table, selected: !allSelected }
        : table
    ),
    activeTableKey: firstSchemaTable ? buildWarehouseTableKey(firstSchemaTable) : null,
  };
}

export function toggleSourceImportDatabaseSelection(
  tables: readonly TableInfo[],
  databaseIdentity: SourceImportDatabaseIdentity
): Readonly<{ tables: TableInfo[]; activeTableKey: string | null }> {
  const databaseTables = tables.filter((table) => table.database === databaseIdentity.database);
  const allSelected = databaseTables.length > 0 && databaseTables.every((table) => table.selected);
  const firstDatabaseTable = databaseTables[0];

  return {
    tables: tables.map((table) =>
      table.database === databaseIdentity.database ? { ...table, selected: !allSelected } : table
    ),
    activeTableKey: firstDatabaseTable ? buildWarehouseTableKey(firstDatabaseTable) : null,
  };
}

export function buildSourceImportRegistryPath(
  table: Pick<TableInfo, 'database' | 'schema'>,
  groupingStrategy: 'schema' | 'database' | 'custom'
): string {
  const groupKey =
    groupingStrategy === 'database'
      ? toStableSourceImportIdentifierPart(table.database)
      : toStableSourceImportIdentifierPart(table.schema);
  return `models/sources/src_${groupKey}.yml`;
}

export function toStableSourceImportIdentifierPart(part: string): string {
  const normalized = part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'unnamed';
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
